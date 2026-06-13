import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { signInWithGoogle, useSession } from "@/lib/auth/session";

export function Footer() {
  const { session, loading } = useSession();
  const [connecting, setConnecting] = useState(false);

  const handleLogin = async () => {
    setConnecting(true);
    try {
      await signInWithGoogle("/minha-conta");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Falha no login pelo rodapé:", error);
      toast.error("Não conseguimos iniciar o login", {
        description: "Tente novamente em instantes.",
      });
      setConnecting(false);
    }
  };

  return (
    <footer className="bg-ink text-white/80">
      <div className="mx-auto max-w-6xl px-5 md:px-8 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="font-display font-bold text-lg flex items-center gap-1">
          <span className="text-xl">☀️</span> Roteiro do Sol
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a href="#como-funciona" className="hover:text-sun transition-colors">
            Como funciona
          </a>
          <a href="#lugares" className="hover:text-sun transition-colors">
            Exemplos
          </a>
          {loading ? (
            <span className="text-white/40">Carregando conta...</span>
          ) : session ? (
            <Link to="/minha-conta" className="hover:text-sun transition-colors">
              Minha conta
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              disabled={connecting}
              className="inline-flex items-center gap-1.5 transition-colors hover:text-sun disabled:opacity-60"
            >
              {connecting ? <Loader2 size={14} className="animate-spin" /> : null}
              {connecting ? "Entrando..." : "Entrar"}
            </button>
          )}
        </nav>
        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} Roteiro do Sol · Feito com sol em Natal/RN
        </p>
      </div>
    </footer>
  );
}
