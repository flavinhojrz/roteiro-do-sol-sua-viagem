-- Roteiro do Sol — escrita de reações via função SECURITY DEFINER
--
-- Por quê: a escrita direta na tabela dependia de policies de RLS para anon, e o
-- DELETE/UPDATE anônimos não removiam/atualizavam a linha de forma confiável (o
-- DELETE retornava 204 sem apagar). Resultado: trocar de reação batia no UNIQUE
-- (itinerary_id, visitor_id) e dava erro 409 no app.
--
-- Solução: uma única função definer faz set/clear de forma atômica (insert on
-- conflict do update / delete), validando que o roteiro é público. O visitante
-- continua sem login e sem poder editar o roteiro em si.
--
-- Como aplicar: cole no SQL Editor do Supabase e rode (seguro de rodar de novo).

create or replace function public.set_itinerary_reaction(
  p_itinerary uuid,
  p_visitor text,
  p_reaction text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_visitor), '') = '' then
    raise exception 'visitor id obrigatório';
  end if;

  if not exists (
    select 1 from public.itineraries i where i.id = p_itinerary and i.is_public = true
  ) then
    raise exception 'roteiro não encontrado ou não é público';
  end if;

  -- p_reaction nulo/vazio = remover a reação do visitante
  if coalesce(trim(p_reaction), '') = '' then
    delete from public.itinerary_reactions
    where itinerary_id = p_itinerary and visitor_id = p_visitor;
    return;
  end if;

  if p_reaction not in ('love', 'in', 'lets_go', 'photos') then
    raise exception 'reação inválida: %', p_reaction;
  end if;

  insert into public.itinerary_reactions (itinerary_id, visitor_id, reaction)
  values (p_itinerary, p_visitor, p_reaction)
  on conflict (itinerary_id, visitor_id)
  do update set reaction = excluded.reaction, updated_at = now();
end;
$$;

grant execute on function public.set_itinerary_reaction(uuid, text, text) to anon, authenticated;

-- A escrita direta na tabela deixa de ser usada pelo app — a função definer é o
-- único caminho. Removemos as policies de escrita (que estavam abrindo a tabela
-- para anon e ainda assim não funcionavam de forma confiável). Sem policy de
-- escrita, a RLS nega escrita direta; a função definer continua funcionando.
drop policy if exists "reactions_insert" on public.itinerary_reactions;
drop policy if exists "reactions_update" on public.itinerary_reactions;
drop policy if exists "reactions_delete" on public.itinerary_reactions;

notify pgrst, 'reload schema';

-- ── Validação (rode depois e confira) ──────────────────────────────────────
-- Função criada:
--   select proname from pg_proc where proname = 'set_itinerary_reaction';
-- Policies restantes na tabela (deve sobrar nenhuma de escrita):
--   select polname, cmd from pg_policies where tablename = 'itinerary_reactions';
