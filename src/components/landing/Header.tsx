import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Menu, X } from "lucide-react";
import { signInWithGoogle, signOut, useSession } from "@/lib/auth/session";

const navLinks = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Explorar exemplos", href: "#lugares" },
];

function useGoogleLogin() {
  const [connecting, setConnecting] = useState(false);

  const login = async () => {
    setConnecting(true);
    try {
      await signInWithGoogle("/meu-roteiro");
    } catch (error) {
      if (import.meta.env.DEV) console.error("Falha no login com Google:", error);
      setConnecting(false);
    }
  };

  return { connecting, login };
}

function EntrarButton({ className }: { className?: string }) {
  const { session, loading } = useSession();
  const { connecting, login } = useGoogleLogin();

  if (loading) {
    return null;
  }

  if (session) {
    return (
      <Link
        to="/meus-roteiros"
        className={
          className ?? "text-sm font-semibold text-ink/80 transition-colors hover:text-coral"
        }
      >
        Meus Roteiros
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={login}
      disabled={connecting}
      className={
        className ??
        "inline-flex items-center gap-1.5 text-sm font-semibold text-ink/80 transition-colors hover:text-coral disabled:opacity-60"
      }
    >
      {connecting ? <Loader2 size={14} className="animate-spin" /> : null}
      {connecting ? "Entrando..." : "Entrar"}
    </button>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const { session } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-sand-soft/70 border-b border-white/40">
      <div className="mx-auto max-w-6xl px-5 md:px-8 h-16 md:h-20 flex items-center justify-between">
        <a
          href="#top"
          className="font-display font-bold text-lg md:text-xl text-ink flex items-center gap-1"
        >
          <span className="text-xl md:text-2xl">☀️</span>
          <span>Roteiro do Sol</span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-semibold text-ink/80 hover:text-coral transition-colors"
            >
              {l.label}
            </a>
          ))}
          <EntrarButton />
          {session ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-sm font-semibold text-ink/50 transition-colors hover:text-coral"
            >
              Sair
            </button>
          ) : null}
          <Link
            to="/onboarding"
            className="press group inline-flex items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-coral hover:shadow-coral-lg hover:-translate-y-0.5"
          >
            Criar meu roteiro
            <span className="ml-1.5 inline-block transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </nav>

        <div className="md:hidden flex items-center gap-2">
          <Link
            to="/onboarding"
            className="inline-flex items-center justify-center rounded-full bg-coral px-4 py-2 text-sm font-bold text-white shadow-coral"
          >
            Criar
          </Link>
          <button
            aria-label="Abrir menu"
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-full hover:bg-white/60 transition-colors"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/40 bg-sand-soft/95 backdrop-blur">
          <div className="px-5 py-4 flex flex-col gap-3">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base font-semibold text-ink py-2"
              >
                {l.label}
              </a>
            ))}
            <EntrarButton className="text-left text-base font-semibold text-ink py-2" />
            {session ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
                className="text-left text-base font-semibold text-ink/60 py-2"
              >
                Sair
              </button>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
