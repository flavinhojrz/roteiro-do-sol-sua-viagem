-- Roteiro do Sol — reações em roteiros públicos compartilhados
--
-- Como aplicar: cole no SQL Editor do Supabase e rode (seguro de rodar de novo).
--
-- Modelo: uma reação por visitante por roteiro. O visitante é identificado por
-- um id anônimo gerado no navegador (visitor_id) — NÃO exige conta.
--
-- Segurança: visitantes só escrevem reações em roteiros PÚBLICOS. As linhas não
-- são legíveis diretamente (não expõe visitor_id); a contagem sai por uma função
-- SECURITY DEFINER. Isto evita duplicação óbvia sem exigir login.

create extension if not exists "pgcrypto";

create table if not exists public.itinerary_reactions (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries (id) on delete cascade,
  visitor_id text not null,
  reaction text not null check (reaction in ('love', 'in', 'lets_go', 'photos')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (itinerary_id, visitor_id)
);

create index if not exists itinerary_reactions_itinerary_idx
  on public.itinerary_reactions (itinerary_id);

alter table public.itinerary_reactions enable row level security;

-- Sem policy de SELECT: ninguém lê as linhas direto (visitor_id fica protegido).
-- Escrita (insert/update/delete) só quando o roteiro-pai é público.
drop policy if exists "reactions_insert" on public.itinerary_reactions;
create policy "reactions_insert" on public.itinerary_reactions
  for insert
  to anon, authenticated
  with check (
    exists (select 1 from public.itineraries i where i.id = itinerary_id and i.is_public = true)
  );

drop policy if exists "reactions_update" on public.itinerary_reactions;
create policy "reactions_update" on public.itinerary_reactions
  for update
  to anon, authenticated
  using (
    exists (select 1 from public.itineraries i where i.id = itinerary_id and i.is_public = true)
  )
  with check (
    exists (select 1 from public.itineraries i where i.id = itinerary_id and i.is_public = true)
  );

drop policy if exists "reactions_delete" on public.itinerary_reactions;
create policy "reactions_delete" on public.itinerary_reactions
  for delete
  to anon, authenticated
  using (
    exists (select 1 from public.itineraries i where i.id = itinerary_id and i.is_public = true)
  );

-- Contagem agregada por tipo, sem expor visitor_id. SECURITY DEFINER ignora a RLS
-- de leitura (que é fechada) mas só devolve dados de roteiros públicos.
create or replace function public.itinerary_reaction_counts(p_itinerary uuid)
returns table (reaction text, count bigint)
language sql
security definer
set search_path = public
as $$
  select r.reaction, count(*)::bigint
  from public.itinerary_reactions r
  join public.itineraries i on i.id = r.itinerary_id
  where r.itinerary_id = p_itinerary and i.is_public = true
  group by r.reaction;
$$;

grant execute on function public.itinerary_reaction_counts(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
