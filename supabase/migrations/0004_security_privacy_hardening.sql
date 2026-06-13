-- Roteiro do Sol - hardening de seguranca e privacidade
--
-- Objetivos:
--   * impedir leitura publica direta de user_id e respostas do onboarding;
--   * reduzir privilegios das tabelas ao minimo necessario;
--   * validar e salvar roteiros de forma atomica;
--   * usar slugs publicos com entropia suficiente;
--   * minimizar o identificador anonimo armazenado para reacoes.

create extension if not exists "pgcrypto";

alter table public.itineraries
  alter column is_public set default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'itineraries_name_length_check'
      and conrelid = 'public.itineraries'::regclass
  ) then
    alter table public.itineraries
      add constraint itineraries_name_length_check
      check (name is null or (char_length(name) <= 80 and name !~ '[[:cntrl:]]'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'itineraries_public_slug_format_check'
      and conrelid = 'public.itineraries'::regclass
  ) then
    alter table public.itineraries
      add constraint itineraries_public_slug_format_check
      check (public_slug ~ '^[a-z0-9]{10,64}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'itineraries_answers_shape_check'
      and conrelid = 'public.itineraries'::regclass
  ) then
    alter table public.itineraries
      add constraint itineraries_answers_shape_check
      check (
        answers is null
        or (
          jsonb_typeof(answers) = 'object'
          and pg_column_size(answers) <= 4096
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'itinerary_items_sort_order_check'
      and conrelid = 'public.itinerary_items'::regclass
  ) then
    alter table public.itinerary_items
      add constraint itinerary_items_sort_order_check
      check (sort_order between 0 and 49);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'itinerary_items_section_check'
      and conrelid = 'public.itinerary_items'::regclass
  ) then
    alter table public.itinerary_items
      add constraint itinerary_items_section_check
      check (section is null or section in ('fits', 'if_time'));
  end if;
end
$$;

-- Remove policies anteriores, inclusive nomes criados manualmente, para evitar
-- que uma policy permissiva antiga continue abrindo dados em paralelo.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('itineraries', 'itinerary_items', 'itinerary_reactions')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

-- A leitura publica passa exclusivamente pela RPC abaixo. RLS permite que o
-- titular leia os dados completos do proprio roteiro.
create policy "itineraries_owner_read" on public.itineraries
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "itinerary_items_owner_read" on public.itinerary_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.itineraries i
      where i.id = itinerary_items.itinerary_id
        and i.user_id = (select auth.uid())
    )
  );

-- Nao permita acesso direto as tabelas por clientes anonimos. Usuarios
-- autenticados leem apenas as proprias linhas por RLS; toda escrita usa RPC.
revoke all on table public.itineraries from anon;
revoke all on table public.itinerary_items from anon;
revoke all on table public.itinerary_reactions from anon;

revoke all on table public.itineraries from authenticated;
revoke all on table public.itinerary_items from authenticated;
revoke all on table public.itinerary_reactions from authenticated;

grant select on table public.itineraries to authenticated;
grant select on table public.itinerary_items to authenticated;

-- Retorna somente metadados deliberadamente publicos e os lugares ordenados.
-- user_id e answers nunca atravessam esta fronteira.
create or replace function public.get_public_itinerary(p_slug text)
returns table (
  id uuid,
  name text,
  public_slug text,
  created_at timestamptz,
  place_ids uuid[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    i.name,
    i.public_slug,
    i.created_at,
    coalesce(
      array_agg(ii.place_id order by ii.sort_order)
        filter (where ii.place_id is not null),
      '{}'::uuid[]
    ) as place_ids
  from public.itineraries i
  left join public.itinerary_items ii on ii.itinerary_id = i.id
  where p_slug ~ '^[a-z0-9]{10,64}$'
    and i.public_slug = p_slug
    and i.is_public = true
  group by i.id, i.name, i.public_slug, i.created_at;
$$;

revoke execute on function public.get_public_itinerary(text) from public, anon, authenticated;
grant execute on function public.get_public_itinerary(text) to anon, authenticated;

-- Cria ou atualiza um roteiro em uma unica transacao. A funcao valida titular,
-- tamanho, formato das preferencias, lugares publicados e quantidade maxima.
create or replace function public.save_itinerary(
  p_id uuid,
  p_name text,
  p_answers jsonb,
  p_place_ids uuid[],
  p_sections text[]
)
returns table (id uuid, public_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_itinerary_id uuid;
  v_public_slug text;
  v_name text := nullif(btrim(p_name), '');
  v_item_count integer := coalesce(cardinality(p_place_ids), 0);
  v_valid_place_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'autenticacao obrigatoria';
  end if;

  if v_name is not null
    and (char_length(v_name) > 80 or v_name ~ '[[:cntrl:]]') then
    raise exception using errcode = '22023', message = 'nome de roteiro invalido';
  end if;

  if v_item_count < 1 or v_item_count > 50 then
    raise exception using errcode = '22023', message = 'quantidade de lugares invalida';
  end if;

  if cardinality(p_sections) is distinct from v_item_count then
    raise exception using errcode = '22023', message = 'secoes do roteiro invalidas';
  end if;

  if exists (
    select 1
    from unnest(p_sections) as section_value
    where section_value is not null
      and section_value not in ('fits', 'if_time')
  ) then
    raise exception using errcode = '22023', message = 'secao do roteiro invalida';
  end if;

  if (
    select count(*) <> count(distinct place_id)
    from unnest(p_place_ids) as place_id
  ) then
    raise exception using errcode = '22023', message = 'lugares duplicados no roteiro';
  end if;

  if p_answers is not null then
    if jsonb_typeof(p_answers) <> 'object' then
      raise exception using errcode = '22023', message = 'preferencias de viagem invalidas';
    end if;

    if pg_column_size(p_answers) > 4096
      or (p_answers - array['company', 'days', 'vibes', 'budget', 'range']::text[]) <> '{}'::jsonb then
      raise exception using errcode = '22023', message = 'preferencias de viagem invalidas';
    end if;

    if (p_answers ? 'company')
      and (
        jsonb_typeof(p_answers -> 'company') <> 'string'
        or char_length(p_answers ->> 'company') > 40
        or (p_answers ->> 'company') not in ('solo', 'couple', 'family', 'friends')
      ) then
      raise exception using errcode = '22023', message = 'preferencias de viagem invalidas';
    end if;

    if (p_answers ? 'days')
      and (
        jsonb_typeof(p_answers -> 'days') <> 'string'
        or char_length(p_answers ->> 'days') > 40
        or (p_answers ->> 'days') not in ('1', '2-3', '4-5', '5+')
      ) then
      raise exception using errcode = '22023', message = 'preferencias de viagem invalidas';
    end if;

    if (p_answers ? 'budget')
      and (
        jsonb_typeof(p_answers -> 'budget') <> 'string'
        or char_length(p_answers ->> 'budget') > 40
        or (p_answers ->> 'budget') not in ('econ', 'balanced', 'comfort')
      ) then
      raise exception using errcode = '22023', message = 'preferencias de viagem invalidas';
    end if;

    if (p_answers ? 'range')
      and (
        jsonb_typeof(p_answers -> 'range') <> 'string'
        or char_length(p_answers ->> 'range') > 40
        or (p_answers ->> 'range') not in ('natal', 'around', 'best')
      ) then
      raise exception using errcode = '22023', message = 'preferencias de viagem invalidas';
    end if;

    if p_answers ? 'vibes' then
      if jsonb_typeof(p_answers -> 'vibes') <> 'array' then
        raise exception using errcode = '22023', message = 'preferencias de viagem invalidas';
      end if;

      if jsonb_array_length(p_answers -> 'vibes') > 5
        or (
          select count(*) <> count(distinct vibe_value #>> '{}')
          from jsonb_array_elements(p_answers -> 'vibes') as vibe_value
        )
        or exists (
          select 1
          from jsonb_array_elements(p_answers -> 'vibes') as vibe_value
          where jsonb_typeof(vibe_value) <> 'string'
            or char_length(vibe_value #>> '{}') > 40
            or (vibe_value #>> '{}') not in (
              'praias',
              'fotos',
              'por-do-sol',
              'aventura',
              'descanso',
              'cultura',
              'artesanato',
              'gastronomia',
              'bate-volta',
              'barato',
              'natureza',
              'romantico'
            )
        ) then
        raise exception using errcode = '22023', message = 'preferencias de viagem invalidas';
      end if;
    end if;
  end if;

  select count(distinct p.id)
  into v_valid_place_count
  from public.places p
  where p.id = any(p_place_ids)
    and p.status = 'published';

  if v_valid_place_count <> v_item_count then
    raise exception using errcode = '22023', message = 'um ou mais lugares nao estao disponiveis';
  end if;

  if p_id is null then
    if (
      select count(*)
      from public.itineraries i
      where i.user_id = v_user_id
    ) >= 100 then
      raise exception using errcode = '22023', message = 'limite de roteiros atingido';
    end if;

    loop
      v_public_slug := encode(extensions.gen_random_bytes(16), 'hex');
      exit when not exists (
        select 1
        from public.itineraries i
        where i.public_slug = v_public_slug
      );
    end loop;

    insert into public.itineraries (
      user_id,
      name,
      public_slug,
      is_public,
      answers
    )
    values (
      v_user_id,
      v_name,
      v_public_slug,
      true,
      p_answers
    )
    returning public.itineraries.id into v_itinerary_id;
  else
    select i.id, i.public_slug
    into v_itinerary_id, v_public_slug
    from public.itineraries i
    where i.id = p_id
      and i.user_id = v_user_id
    for update;

    if v_itinerary_id is null then
      raise exception using errcode = '42501', message = 'roteiro nao encontrado';
    end if;

    update public.itineraries i
    set
      name = v_name,
      answers = p_answers,
      updated_at = now()
    where i.id = v_itinerary_id;

    delete from public.itinerary_items ii
    where ii.itinerary_id = v_itinerary_id;
  end if;

  insert into public.itinerary_items (
    itinerary_id,
    place_id,
    sort_order,
    section
  )
  select
    v_itinerary_id,
    p_place_ids[item_index],
    item_index - 1,
    p_sections[item_index]
  from generate_subscripts(p_place_ids, 1) as item_index;

  return query select v_itinerary_id, v_public_slug;
end;
$$;

revoke execute on function public.save_itinerary(uuid, text, jsonb, uuid[], text[])
  from public, anon, authenticated;
grant execute on function public.save_itinerary(uuid, text, jsonb, uuid[], text[])
  to authenticated;

create or replace function public.delete_itinerary(p_itinerary uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'autenticacao obrigatoria';
  end if;

  delete from public.itineraries i
  where i.id = p_itinerary
    and i.user_id = auth.uid();

  if not found then
    raise exception using errcode = '42501', message = 'roteiro nao encontrado';
  end if;
end;
$$;

revoke execute on function public.delete_itinerary(uuid) from public, anon, authenticated;
grant execute on function public.delete_itinerary(uuid) to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'autenticacao obrigatoria';
  end if;

  delete from auth.users u
  where u.id = v_user_id;

  if not found then
    raise exception using errcode = '42501', message = 'conta nao encontrada';
  end if;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon, authenticated;
grant execute on function public.delete_my_account() to authenticated;

-- O identificador recebido do navegador e aleatorio por roteiro. Armazenamos
-- somente um hash, evitando correlacao direta entre navegacao e banco.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'itinerary_reactions_visitor_hash_check'
      and conrelid = 'public.itinerary_reactions'::regclass
  ) then
    update public.itinerary_reactions
    set visitor_id = encode(
      extensions.digest(itinerary_id::text || ':' || visitor_id, 'sha256'),
      'hex'
    );

    alter table public.itinerary_reactions
      add constraint itinerary_reactions_visitor_hash_check
      check (visitor_id ~ '^[0-9a-f]{64}$');
  end if;
end
$$;

create or replace function public.itinerary_reaction_counts(p_itinerary uuid)
returns table (reaction text, count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.reaction, count(*)::bigint
  from public.itinerary_reactions r
  join public.itineraries i on i.id = r.itinerary_id
  where r.itinerary_id = p_itinerary
    and i.is_public = true
  group by r.reaction;
$$;

revoke execute on function public.itinerary_reaction_counts(uuid)
  from public, anon, authenticated;
grant execute on function public.itinerary_reaction_counts(uuid) to anon, authenticated;

create or replace function public.set_itinerary_reaction(
  p_itinerary uuid,
  p_visitor text,
  p_reaction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visitor_hash text;
begin
  if p_visitor is null
    or p_visitor !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = '22023', message = 'identificador de visitante invalido';
  end if;

  if not exists (
    select 1
    from public.itineraries i
    where i.id = p_itinerary
      and i.is_public = true
  ) then
    raise exception using errcode = '22023', message = 'roteiro indisponivel';
  end if;

  v_visitor_hash := encode(
    extensions.digest(p_itinerary::text || ':' || lower(p_visitor), 'sha256'),
    'hex'
  );

  if coalesce(btrim(p_reaction), '') = '' then
    delete from public.itinerary_reactions r
    where r.itinerary_id = p_itinerary
      and r.visitor_id = v_visitor_hash;
    return;
  end if;

  if p_reaction not in ('love', 'in', 'lets_go', 'photos') then
    raise exception using errcode = '22023', message = 'reacao invalida';
  end if;

  insert into public.itinerary_reactions (
    itinerary_id,
    visitor_id,
    reaction
  )
  values (
    p_itinerary,
    v_visitor_hash,
    p_reaction
  )
  on conflict (itinerary_id, visitor_id)
  do update set
    reaction = excluded.reaction,
    updated_at = now();
end;
$$;

revoke execute on function public.set_itinerary_reaction(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.set_itinerary_reaction(uuid, text, text)
  to anon, authenticated;

notify pgrst, 'reload schema';
