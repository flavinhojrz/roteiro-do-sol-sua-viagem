import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";

export const Route = createFileRoute("/roteiro")({
  head: () => ({
    meta: [
      { title: "Seu roteiro — Roteiro do Sol" },
      {
        name: "description",
        content: "Lugares em Natal/RN que combinam com sua vibe de viagem.",
      },
    ],
  }),
  component: RoteiroPage,
});

function RoteiroPage() {
  return (
    <div className="relative min-h-screen bg-gradient-sky overflow-hidden">
      <SunBurst className="pointer-events-none absolute -top-10 -right-10 w-72 h-72 md:w-96 md:h-96 opacity-50 animate-sun-pulse" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 w-[110%] h-24 md:h-32 animate-wave-drift" />

      <div className="relative mx-auto max-w-4xl px-5 md:px-8 py-12 md:py-20">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 hover:text-coral transition-colors"
        >
          <ArrowLeft size={16} /> Voltar para a home
        </Link>

        <div className="mt-8 md:mt-12 text-center md:text-left animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-4 py-1.5 text-xs font-bold text-sea uppercase tracking-wider">
            ✨ Seu roteiro
          </span>
          <h1 className="mt-5 font-display font-extrabold text-3xl md:text-5xl leading-tight text-ink">
            Lugares que combinam com{" "}
            <span className="bg-gradient-sun bg-clip-text text-transparent">sua vibe ☀️</span>
          </h1>
          <p className="mt-4 text-ink/65 text-base md:text-lg max-w-xl mx-auto md:mx-0">
            Em breve, aqui você vai ver os lugares selecionados para a sua viagem. Estamos
            preparando o catálogo com muito carinho.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
              className="animate-fade-up rounded-3xl bg-white shadow-soft overflow-hidden"
            >
              <div className="h-40 bg-gradient-to-br from-sea-soft via-aqua/30 to-sun/30 flex items-center justify-center text-4xl">
                {["🌊", "🌅", "🏖️", "🧭", "🌴", "📸"][i]}
              </div>
              <div className="p-5">
                <div className="h-4 w-2/3 rounded-full bg-ink/10" />
                <div className="mt-3 h-3 w-full rounded-full bg-ink/5" />
                <div className="mt-2 h-3 w-4/5 rounded-full bg-ink/5" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/onboarding"
            className="press inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-ink shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5"
          >
            Refazer meu roteiro
          </Link>
        </div>
      </div>
    </div>
  );
}
