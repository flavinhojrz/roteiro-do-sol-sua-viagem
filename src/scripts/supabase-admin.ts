import { createClient } from "@supabase/supabase-js";

export function createAdminSupabaseClient() {
  const urlValue = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!urlValue) {
    throw new Error("Missing SUPABASE_URL");
  }
  if (!key) {
    throw new Error("Missing SUPABASE_SECRET_KEY");
  }

  const url = new URL(urlValue);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !isLocal) {
    throw new Error("SUPABASE_URL must use HTTPS");
  }

  const legacyRole = getLegacyJwtRole(key);
  if (key.startsWith("sb_publishable_") || legacyRole === "anon") {
    throw new Error("The import script requires a secret/service_role key");
  }
  if (!key.startsWith("sb_secret_") && legacyRole !== "service_role") {
    throw new Error("Invalid Supabase admin key");
  }

  return createClient(url.toString(), key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getLegacyJwtRole(key: string): string | null {
  const payload = key.split(".")[1];
  if (!payload) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: unknown;
    };
    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}
