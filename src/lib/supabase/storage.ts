import { getAccessToken, supabasePublishableKey, supabaseUrl } from "./client";

// Upload "enxuto" pro Supabase Storage via REST, sem `@supabase/storage-js` (que
// reinflaria o bundle do cliente). Reaproveita a mesma autenticação do client:
// token da sessão atual, ou a chave pública quando o visitante não está logado.

const STORAGE_BASE = `${supabaseUrl.replace(/\/$/, "")}/storage/v1`;

/** Sobe um arquivo para `bucket/path`. Lança em caso de falha. */
export async function uploadPublicObject(bucket: string, path: string, file: File): Promise<void> {
  const accessToken = await getAccessToken();
  const res = await fetch(`${STORAGE_BASE}/object/${bucket}/${encodePath(path)}`, {
    method: "POST",
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false",
    },
    body: file,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`upload falhou (${res.status}): ${detail.slice(0, 200)}`);
  }
}

/** URL pública de um objeto em bucket público. */
export function publicObjectUrl(bucket: string, path: string): string {
  return `${STORAGE_BASE}/object/public/${bucket}/${encodePath(path)}`;
}

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
