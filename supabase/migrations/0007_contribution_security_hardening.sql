-- Roteiro do Sol - hardening das contribuicoes e uploads publicos
--
-- Objetivos:
--   * impedir que a Data API exponha user_id/consentimento de contribuicoes;
--   * publicar somente contribuicoes aprovadas de lugares publicados;
--   * restringir uploads anonimos a caminhos temporarios no formato esperado;
--   * validar photo_paths tambem dentro da RPC SECURITY DEFINER;
--   * remover EXECUTE implicito de PUBLIC da RPC de envio.

alter table public.place_contributions enable row level security;

-- A leitura publica passa a ser apenas para contribuicoes aprovadas que estejam
-- presas a lugares publicados. Sugestoes de novos lugares ficam para moderacao
-- interna e nao sao despejadas pela API publica.
drop policy if exists "contributions_public_read" on public.place_contributions;
create policy "contributions_public_read" on public.place_contributions
  for select
  to anon, authenticated
  using (
    status = 'approved'
    and place_id is not null
    and exists (
      select 1
      from public.places p
      where p.id = place_contributions.place_id
        and p.status = 'published'
    )
  );

revoke all on table public.place_contributions from anon, authenticated;
grant select (
  id,
  place_id,
  display_name,
  is_anonymous,
  opinion,
  suggestion,
  price_cents,
  price_note,
  rating,
  photo_paths,
  status,
  created_at
) on public.place_contributions to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'place_contributions_photo_count_check'
      and conrelid = 'public.place_contributions'::regclass
  ) then
    alter table public.place_contributions
      add constraint place_contributions_photo_count_check
      check (coalesce(cardinality(photo_paths), 0) <= 4)
      not valid;
  end if;
end
$$;

create or replace function public.submit_contribution(
  p_place_id uuid,
  p_suggested_place text,
  p_opinion text,
  p_suggestion text,
  p_price_cents integer,
  p_price_note text,
  p_rating integer,
  p_display_name text,
  p_is_anonymous boolean,
  p_photo_paths text[],
  p_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_place_id uuid := p_place_id;
  v_suggested text := nullif(btrim(coalesce(p_suggested_place, '')), '');
  v_opinion text := nullif(btrim(coalesce(p_opinion, '')), '');
  v_suggestion text := nullif(btrim(coalesce(p_suggestion, '')), '');
  v_price_note text := nullif(btrim(coalesce(p_price_note, '')), '');
  v_display text := nullif(btrim(coalesce(p_display_name, '')), '');
  v_anon boolean := coalesce(p_is_anonymous, true);
  v_paths text[] := coalesce(p_photo_paths, '{}'::text[]);
begin
  if p_consent is not true then
    raise exception using errcode = '22023', message = 'consentimento obrigatorio';
  end if;

  -- Lugar existente precisa estar publicado; contribuicoes para itens internos
  -- ou rascunhos nao podem ser criadas pela API publica.
  if v_place_id is not null and not exists (
    select 1
    from public.places p
    where p.id = v_place_id
      and p.status = 'published'
  ) then
    raise exception using errcode = '22023', message = 'lugar indisponivel';
  end if;

  if v_place_id is null and v_suggested is null then
    raise exception using errcode = '22023', message = 'informe um lugar ou uma sugestao';
  end if;

  if v_opinion is null and v_suggestion is null and p_price_cents is null then
    raise exception using errcode = '22023', message = 'contribuicao vazia';
  end if;

  if p_price_cents is not null and (p_price_cents < 0 or p_price_cents > 100000000) then
    raise exception using errcode = '22023', message = 'preco invalido';
  end if;

  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception using errcode = '22023', message = 'nota invalida';
  end if;

  if length(coalesce(v_opinion, '')) > 1000
     or length(coalesce(v_suggestion, '')) > 1000
     or length(coalesce(v_suggested, '')) > 120
     or length(coalesce(v_price_note, '')) > 120
     or length(coalesce(v_display, '')) > 60 then
    raise exception using errcode = '22023', message = 'texto excede o limite';
  end if;

  if v_suggested ~ '[[:cntrl:]]'
     or v_price_note ~ '[[:cntrl:]]'
     or v_display ~ '[[:cntrl:]]'
     or translate(coalesce(v_opinion, ''), chr(9) || chr(10) || chr(13), '') ~ '[[:cntrl:]]'
     or translate(coalesce(v_suggestion, ''), chr(9) || chr(10) || chr(13), '') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'texto contem caracteres invalidos';
  end if;

  if not v_anon and v_display is null then
    v_anon := true;
  end if;

  if cardinality(v_paths) > 4 then
    raise exception using errcode = '22023', message = 'maximo de 4 fotos';
  end if;

  if exists (
    select 1
    from unnest(v_paths) as photo_path
    where photo_path is null
      or photo_path !~* '^pending/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  ) then
    raise exception using errcode = '22023', message = 'caminho de foto invalido';
  end if;

  if (
    select count(*) <> count(distinct photo_path)
    from unnest(v_paths) as photo_path
  ) then
    raise exception using errcode = '22023', message = 'fotos duplicadas';
  end if;

  insert into public.place_contributions (
    place_id,
    suggested_place,
    user_id,
    display_name,
    is_anonymous,
    opinion,
    suggestion,
    price_cents,
    price_note,
    rating,
    photo_paths,
    status,
    consent_at
  ) values (
    v_place_id,
    case when v_place_id is null then v_suggested else null end,
    auth.uid(),
    case when v_anon then null else v_display end,
    v_anon,
    v_opinion,
    v_suggestion,
    p_price_cents,
    v_price_note,
    p_rating,
    v_paths,
    'pending',
    now()
  )
  returning public.place_contributions.id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.submit_contribution(
  uuid, text, text, text, integer, text, integer, text, boolean, text[], boolean
) from public, anon, authenticated;
grant execute on function public.submit_contribution(
  uuid, text, text, text, integer, text, integer, text, boolean, text[], boolean
) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contributions',
  'contributions',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "contributions_objects_insert" on storage.objects;
create policy "contributions_objects_insert" on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'contributions'
    and name ~* '^pending/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

notify pgrst, 'reload schema';
