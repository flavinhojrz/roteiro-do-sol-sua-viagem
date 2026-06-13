-- Roteiro do Sol - menor privilegio para o catalogo publico
--
-- O navegador recebe apenas colunas usadas pela interface. Metadados internos,
-- fontes editoriais e registros nao publicados ficam fora da Data API publica.

alter table public.places enable row level security;
alter table public.place_images enable row level security;
alter table public.place_vibes enable row level security;
alter table public.vibes enable row level security;
alter table public.place_sources enable row level security;
alter table public.connection_test enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'places',
        'place_images',
        'place_vibes',
        'vibes',
        'place_sources',
        'connection_test'
      )
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

create policy "places_public_read" on public.places
  for select
  to anon, authenticated
  using (status = 'published');

create policy "place_images_public_read" on public.place_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.places p
      where p.id = place_images.place_id
        and p.status = 'published'
    )
  );

create policy "place_vibes_public_read" on public.place_vibes
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.places p
      where p.id = place_vibes.place_id
        and p.status = 'published'
    )
  );

create policy "vibes_public_read" on public.vibes
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.place_vibes pv
      join public.places p on p.id = pv.place_id
      where pv.vibe_id = vibes.id
        and p.status = 'published'
    )
  );

-- Nenhuma policy em place_sources: notas e referencias de pesquisa permanecem
-- acessiveis apenas por papeis administrativos. connection_test tambem fica
-- fechada por ser uma tabela auxiliar sem uso no produto.

revoke all on table public.places from anon, authenticated;
revoke all on table public.place_images from anon, authenticated;
revoke all on table public.place_vibes from anon, authenticated;
revoke all on table public.vibes from anon, authenticated;
revoke all on table public.place_sources from anon, authenticated;
revoke all on table public.connection_test from anon, authenticated;

-- Funcao auxiliar de infraestrutura nao faz parte da API do produto.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

grant select (
  id,
  name,
  slug,
  category,
  region,
  location_label,
  short_description,
  long_description,
  best_time,
  average_duration,
  price_level,
  approximate_price,
  google_maps_url,
  latitude,
  longitude,
  is_inside_natal,
  is_day_trip,
  status,
  created_at
) on public.places to anon, authenticated;

grant select (
  id,
  place_id,
  image_url,
  alt_text,
  credit_text,
  license,
  source_url,
  is_cover,
  sort_order
) on public.place_images to anon, authenticated;

grant select (
  place_id,
  vibe_id,
  weight
) on public.place_vibes to anon, authenticated;

grant select (
  id,
  label,
  emoji,
  sort_order
) on public.vibes to anon, authenticated;

notify pgrst, 'reload schema';
