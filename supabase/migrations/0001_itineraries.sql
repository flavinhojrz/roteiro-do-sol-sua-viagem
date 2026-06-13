-- Roteiro do Sol — roteiros salvos e compartilháveis
--
-- Como aplicar: cole este arquivo no SQL Editor do Supabase e rode, ou use a
-- Supabase CLI (`supabase db push`). Seguro de rodar mais de uma vez.
--
-- Modelo:
--   itineraries       → um roteiro salvo por um usuário autenticado
--   itinerary_items   → REFERÊNCIA aos lugares reais (não copia os dados)
--
-- RLS garante: dono edita o seu; qualquer visitante lê roteiros públicos;
-- roteiros privados não vazam.

create extension if not exists "pgcrypto";

-- ── Tabelas ────────────────────────────────────────────────────────────────
create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  public_slug text not null unique,
  is_public boolean not null default true,
  -- respostas básicas do onboarding (company/days/vibes/budget/range), opcional
  answers jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  sort_order integer not null default 0,
  -- seção simples: "fits" (Cabe na sua viagem) | "if_time" (Se der tempo) | null
  section text,
  created_at timestamptz not null default now(),
  unique (itinerary_id, place_id)
);

create index if not exists itinerary_items_itinerary_id_idx
  on public.itinerary_items (itinerary_id);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.itineraries enable row level security;
alter table public.itinerary_items enable row level security;

-- itineraries: dono faz tudo no que é dele
drop policy if exists "itineraries_owner_all" on public.itineraries;
create policy "itineraries_owner_all" on public.itineraries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- itineraries: qualquer pessoa (inclusive anônima) lê os públicos
drop policy if exists "itineraries_public_read" on public.itineraries;
create policy "itineraries_public_read" on public.itineraries
  for select
  using (is_public = true);

-- itinerary_items: leitura quando o roteiro é público OU é do próprio usuário
drop policy if exists "itinerary_items_read" on public.itinerary_items;
create policy "itinerary_items_read" on public.itinerary_items
  for select
  using (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id
        and (i.is_public = true or i.user_id = auth.uid())
    )
  );

-- itinerary_items: escrita apenas pelo dono do roteiro
drop policy if exists "itinerary_items_owner_write" on public.itinerary_items;
create policy "itinerary_items_owner_write" on public.itinerary_items
  for all
  using (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id and i.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.itineraries i
      where i.id = itinerary_id and i.user_id = auth.uid()
    )
  );

-- ── Recarrega o schema cache do PostgREST/Supabase ─────────────────────────
-- Sem isto, a API pode responder "Could not find the table in the schema cache"
-- até o cache expirar. Força o reload imediatamente após criar as tabelas.
notify pgrst, 'reload schema';
