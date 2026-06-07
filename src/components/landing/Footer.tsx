export function Footer() {
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
          <a href="#entrar" className="hover:text-sun transition-colors">
            Entrar
          </a>
        </nav>
        <p className="text-xs text-white/50">
          © {new Date().getFullYear()} Roteiro do Sol · Feito com sol em Natal/RN
        </p>
      </div>
    </footer>
  );
}
