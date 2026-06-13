import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Sessão atual do Supabase Auth (ou null). Mantém-se em sincronia com login,
 * logout e retorno do magic link (a sessão é detectada na URL automaticamente).
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

/**
 * Login com Google (OAuth). Redireciona para o Google e volta para `redirectTo`.
 * Método principal de autenticação enquanto não houver SMTP próprio para e-mail.
 */
export async function signInWithGoogle(redirectPath: string) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: buildAuthRedirectUrl(redirectPath) },
  });
  if (error) throw new Error(error.message);
}

/**
 * Magic link por e-mail. Desativado no fluxo principal por ora (limite do SMTP
 * gratuito do Supabase). Mantido para reativar quando houver SMTP próprio.
 */
export async function sendMagicLink(email: string, redirectPath: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: buildAuthRedirectUrl(redirectPath) },
  });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Não conseguimos encerrar sua sessão agora.");
}

export async function deleteMyAccount() {
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw new Error("Não conseguimos excluir sua conta agora.");
  await supabase.auth.signOut({ scope: "local" });
}

function buildAuthRedirectUrl(path: string): string {
  if (
    typeof window === "undefined" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\")
  ) {
    throw new Error("Destino de autenticação inválido.");
  }

  return new URL(path, window.location.origin).toString();
}
