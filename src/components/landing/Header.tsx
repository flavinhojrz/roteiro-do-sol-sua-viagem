import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Explorar exemplos", href: "#lugares" },
  { label: "Entrar", href: "#entrar" },
];

export function Header() {
  const [open, setOpen] = useState(false);

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
          <a
            href="#criar"
            className="inline-flex items-center justify-center rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-coral hover:scale-[1.03] transition-transform"
          >
            Criar meu roteiro
          </a>
        </nav>

        <div className="md:hidden flex items-center gap-2">
          <a
            href="#criar"
            className="inline-flex items-center justify-center rounded-full bg-coral px-4 py-2 text-sm font-bold text-white shadow-coral"
          >
            Criar
          </a>
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
          </div>
        </div>
      )}
    </header>
  );
}
