// Moderação das contribuições da comunidade (opiniões, preços, fotos).
//
// Toda contribuição entra como `pending` e só aparece no site depois de aprovada.
// Este script roda com a chave service_role (ignora RLS) — use só localmente.
//
// Uso (sempre via bun + .env.admin.local):
//   bun run moderate:contributions                      # lista as pendentes
//   bun run moderate:contributions list [status]        # status: pending|approved|rejected|all
//   bun run moderate:contributions approve <id> [<id>…]
//   bun run moderate:contributions reject  <id> [<id>…] # também apaga as fotos
//
// Ao rejeitar, as fotos enviadas são removidas do bucket `contributions` para
// não deixar lixo (e custo) no Storage.

import { createAdminSupabaseClient } from "./supabase-admin";

const BUCKET = "contributions";
const VALID_STATUSES = ["pending", "approved", "rejected"] as const;
type Status = (typeof VALID_STATUSES)[number];

const supabase = createAdminSupabaseClient();

type ContributionRow = {
  id: string;
  place_id: string | null;
  suggested_place: string | null;
  user_id: string | null;
  display_name: string | null;
  is_anonymous: boolean;
  opinion: string | null;
  suggestion: string | null;
  price_cents: number | null;
  price_note: string | null;
  rating: number | null;
  photo_paths: string[] | null;
  status: Status;
  created_at: string;
  places: { name: string; slug: string } | null;
};

const SELECT =
  "id, place_id, suggested_place, user_id, display_name, is_anonymous, opinion, suggestion, price_cents, price_note, rating, photo_paths, status, created_at, places(name, slug)";

function publicUrl(path: string): string {
  const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const encoded = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/storage/v1/object/public/${BUCKET}/${encoded}`;
}

function formatPrice(cents: number | null): string {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function printContribution(row: ContributionRow) {
  const place = row.places?.name ?? row.suggested_place ?? "(lugar removido)";
  const target = row.place_id ? `catálogo: ${place}` : `sugestão: ${place}`;
  const author = row.is_anonymous ? "Anônimo" : (row.display_name ?? "Anônimo");
  const when = new Date(row.created_at).toLocaleString("pt-BR");

  console.log(`\n── ${row.id}  [${row.status}]`);
  console.log(`   ${target}`);
  console.log(`   autor: ${author}${row.user_id ? " (logado)" : ""} · ${when}`);
  if (row.rating) console.log(`   nota: ${"★".repeat(row.rating)}${"☆".repeat(5 - row.rating)}`);
  if (row.opinion) console.log(`   opinião: ${row.opinion}`);
  if (row.suggestion) console.log(`   sugestão: ${row.suggestion}`);
  if (row.price_cents !== null) {
    console.log(
      `   preço: ${formatPrice(row.price_cents)}${row.price_note ? ` (${row.price_note})` : ""}`,
    );
  }
  for (const path of row.photo_paths ?? []) {
    console.log(`   foto: ${publicUrl(path)}`);
  }
}

async function listContributions(statusArg: string | undefined) {
  const status = (statusArg ?? "pending").toLowerCase();
  if (status !== "all" && !VALID_STATUSES.includes(status as Status)) {
    throw new Error(`status inválido: ${status} (use pending|approved|rejected|all)`);
  }

  let query = supabase
    .from("place_contributions")
    .select(SELECT)
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as ContributionRow[];
  if (rows.length === 0) {
    console.log(`Nenhuma contribuição com status "${status}".`);
    return;
  }

  console.log(`${rows.length} contribuição(ões) [${status}]:`);
  rows.forEach(printContribution);
  console.log(
    `\nPara moderar:\n  bun run moderate:contributions approve <id>\n  bun run moderate:contributions reject <id>`,
  );
}

async function fetchPhotoPaths(ids: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from("place_contributions")
    .select("photo_paths")
    .in("id", ids);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { photo_paths: string[] | null }[]).flatMap(
    (row) => row.photo_paths ?? [],
  );
}

async function setStatus(status: Status, ids: string[]) {
  if (ids.length === 0) {
    throw new Error(`informe ao menos um id: bun run moderate:contributions ${status} <id>`);
  }

  // Ao rejeitar, remove as fotos do Storage antes de marcar o status.
  if (status === "rejected") {
    const paths = await fetchPhotoPaths(ids);
    if (paths.length > 0) {
      const { error } = await supabase.storage.from(BUCKET).remove(paths);
      if (error) console.warn(`Aviso: falha ao remover fotos: ${error.message}`);
      else console.log(`Fotos removidas do Storage: ${paths.length}`);
    }
  }

  const { data, error } = await supabase
    .from("place_contributions")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)
    .select("id");
  if (error) throw new Error(error.message);

  const updated = (data ?? []) as { id: string }[];
  console.log(`${updated.length} contribuição(ões) → ${status}.`);
  const notFound = ids.filter((id) => !updated.some((row) => row.id === id));
  if (notFound.length > 0) console.warn(`Ids não encontrados: ${notFound.join(", ")}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case undefined:
    case "list":
      await listContributions(rest[0]);
      break;
    case "approve":
      await setStatus("approved", rest);
      break;
    case "reject":
      await setStatus("rejected", rest);
      break;
    default:
      throw new Error(`comando desconhecido: ${command}\nuse: list | approve <id> | reject <id>`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
