-- Roteiro do Sol — contribuições da comunidade (opiniões, sugestões, preços, fotos)
--
-- Como aplicar: cole este arquivo no SQL Editor do Supabase e rode, ou use a
-- Supabase CLI (`supabase db push`). Seguro de rodar mais de uma vez.
--
-- Modelo:
--   place_contributions → uma contribuição (de visitante anônimo OU usuário logado)
--                         sobre um lugar do catálogo OU uma sugestão de lugar novo.
--
-- Fluxo:
--   - Qualquer pessoa (anon ou logada) envia via RPC `submit_contribution`
--     (SECURITY DEFINER). A escrita direta na tabela é negada pela RLS.
--   - Toda contribuição entra como status='pending'. Só aparece no site depois
--     de aprovada por um moderador (service role / script CLI).
--   - Leitura pública (anon/authenticated) enxerga apenas as 'approved'.
--
-- Risco conhecido (anti-abuso): bucket público + envio anônimo permite upload de
-- lixo. Mitigações v1: bucket com limite de 5MB e só imagens, máx. 4 fotos por
-- envio, e o script de moderação remove as fotos de contribuições rejeitadas.
-- Rate-limit/captcha fica como follow-up.

create extension if not exists "pgcrypto";

-- ── Tabela ─────────────────────────────────────────────────────────────────
create table if not exists public.place_contributions (
  id uuid primary key default gen_random_uuid(),
  -- lugar existente do catálogo (null quando é sugestão de lugar novo)
  place_id uuid references public.places (id) on delete set null,
  -- sugestão de lugar fora do catálogo
  suggested_place text,
  -- autor: null = visitante anônimo / não logado
  user_id uuid references auth.users (id) on delete set null,
  -- nome exibido quando a pessoa opta por se identificar
  display_name text,
  is_anonymous boolean not null default true,
  opinion text,
  suggestion text,
  -- preço real informado + a que se refere (ex.: ingresso, barraca, prato)
  price_cents integer check (price_cents is null or price_cents >= 0),
  price_note text,
  rating smallint check (rating is null or rating between 1 and 5),
  -- paths dos objetos no bucket público `contributions`
  photo_paths text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- carimbo do consentimento; NOT NULL força que sempre haja consentimento
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- precisa apontar para um lugar (existente ou sugerido)
  constraint place_contributions_target_check
    check (place_id is not null or suggested_place is not null),
  -- não pode ser totalmente vazio
  constraint place_contributions_content_check
    check (opinion is not null or suggestion is not null or price_cents is not null)
);

create index if not exists place_contributions_place_status_idx
  on public.place_contributions (place_id, status);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.place_contributions enable row level security;

-- Leitura pública: qualquer um (inclusive anônimo) lê apenas as aprovadas.
drop policy if exists "contributions_public_read" on public.place_contributions;
create policy "contributions_public_read" on public.place_contributions
  for select
  using (status = 'approved');

-- Sem policies de insert/update/delete: a escrita direta é negada pela RLS.
-- O único caminho de escrita é a função definer abaixo. A moderação
-- (update de status / delete) é feita via service role, que ignora RLS.

-- Least-privilege: o role anon/authenticated só precisa de SELECT (a RLS limita
-- às aprovadas). A função definer roda como dono e ignora esses grants.
revoke all on table public.place_contributions from anon, authenticated;
grant select on table public.place_contributions to anon, authenticated;

-- ── RPC de envio (SECURITY DEFINER) ────────────────────────────────────────
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
set search_path = public
as $$
declare
  v_id uuid;
  v_place_id uuid := p_place_id;
  v_suggested text := nullif(trim(coalesce(p_suggested_place, '')), '');
  v_opinion text := nullif(trim(coalesce(p_opinion, '')), '');
  v_suggestion text := nullif(trim(coalesce(p_suggestion, '')), '');
  v_price_note text := nullif(trim(coalesce(p_price_note, '')), '');
  v_display text := nullif(trim(coalesce(p_display_name, '')), '');
  v_anon boolean := coalesce(p_is_anonymous, true);
  v_paths text[] := coalesce(p_photo_paths, '{}');
begin
  if p_consent is not true then
    raise exception 'consentimento obrigatório';
  end if;

  -- lugar existente precisa existir de fato; senão tratamos como sugestão
  if v_place_id is not null and not exists (
    select 1 from public.places p where p.id = v_place_id
  ) then
    raise exception 'lugar inexistente';
  end if;

  if v_place_id is null and v_suggested is null then
    raise exception 'informe um lugar ou uma sugestão';
  end if;

  if v_opinion is null and v_suggestion is null and p_price_cents is null then
    raise exception 'contribuição vazia';
  end if;

  if p_price_cents is not null and (p_price_cents < 0 or p_price_cents > 100000000) then
    raise exception 'preço inválido';
  end if;

  if p_rating is not null and (p_rating < 1 or p_rating > 5) then
    raise exception 'nota inválida';
  end if;

  -- limites de tamanho (defesa em profundidade; o cliente também sanitiza)
  if length(coalesce(v_opinion, '')) > 1000
     or length(coalesce(v_suggestion, '')) > 1000
     or length(coalesce(v_suggested, '')) > 120
     or length(coalesce(v_price_note, '')) > 120
     or length(coalesce(v_display, '')) > 60 then
    raise exception 'texto excede o limite';
  end if;

  if array_length(v_paths, 1) > 4 then
    raise exception 'máximo de 4 fotos';
  end if;

  insert into public.place_contributions (
    place_id, suggested_place, user_id, display_name, is_anonymous,
    opinion, suggestion, price_cents, price_note, rating, photo_paths,
    status, consent_at
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
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.submit_contribution(
  uuid, text, text, text, integer, text, integer, text, boolean, text[], boolean
) to anon, authenticated;

-- ── Storage: bucket público para as fotos ──────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contributions', 'contributions', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Insert de objetos no bucket por anon/authenticated. Leitura é pública (bucket
-- público). Sem update/delete para usuários — limpeza fica para o service role.
drop policy if exists "contributions_objects_insert" on storage.objects;
create policy "contributions_objects_insert" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'contributions');

notify pgrst, 'reload schema';

-- ── Validação (rode depois e confira) ──────────────────────────────────────
-- Tabela e função criadas:
--   select proname from pg_proc where proname = 'submit_contribution';
--   select polname, cmd from pg_policies where tablename = 'place_contributions';
-- Bucket criado público:
--   select id, public, file_size_limit from storage.buckets where id = 'contributions';
