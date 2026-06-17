import { GoTrueClient } from "@supabase/auth-js";
import { PostgrestClient } from "@supabase/postgrest-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabasePublishableKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL");
}

if (!supabasePublishableKey) {
  throw new Error("Missing VITE_SUPABASE_KEY");
}

assertSafePublicConfig(supabaseUrl, supabasePublishableKey);

const baseUrl = new URL(supabaseUrl);
const storageKey = `sb-${baseUrl.hostname.split(".")[0]}-auth-token`;
const globalHeaders = { "X-Client-Info": "supabase-js/2.107.0" };

const auth = new GoTrueClient({
  url: new URL("auth/v1", baseUrl).href,
  headers: {
    Authorization: `Bearer ${supabasePublishableKey}`,
    apikey: supabasePublishableKey,
    ...globalHeaders,
  },
  storageKey,
  flowType: "pkce",
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
});

// Envolve o fetch para anexar `apikey` e `Authorization` (token da sessão
// atual, ou a chave pública quando não houver login) — exatamente como o
// supabase-js faz, garantindo que o RLS use o JWT do usuário logado.
const fetchWithAuth: typeof fetch = async (input, init) => {
  const accessToken = await getAccessToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("apikey")) headers.set("apikey", supabasePublishableKey);
  if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(input, { ...init, headers });
};

// Token da sessão atual (ou a chave pública quando não há login). Exposto para
// outras chamadas REST que precisam da mesma autenticação (ex.: Storage).
export async function getAccessToken(): Promise<string> {
  const { data } = await auth.getSession();
  return data.session?.access_token ?? supabasePublishableKey;
}

const rest = new PostgrestClient(new URL("rest/v1", baseUrl).href, {
  headers: globalHeaders,
  schema: "public",
  fetch: fetchWithAuth,
});

export const supabase = {
  auth,
  from: rest.from.bind(rest),
  rpc: rest.rpc.bind(rest),
  schema: rest.schema.bind(rest),
};

function assertSafePublicConfig(urlValue: string, key: string) {
  const url = new URL(urlValue);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";

  if (url.protocol !== "https:" && !isLocal) {
    throw new Error("VITE_SUPABASE_URL must use HTTPS");
  }

  if (key.startsWith("sb_secret_") || getLegacyJwtRole(key) === "service_role") {
    throw new Error("VITE_SUPABASE_KEY must be a publishable/anon key, never an admin key");
  }
}

function getLegacyJwtRole(key: string): string | null {
  const payload = key.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const decoded = JSON.parse(globalThis.atob(normalized)) as { role?: unknown };
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}
