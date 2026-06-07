import { Sparkles, Map, Heart } from "lucide-react";
import { Reveal } from "./Reveal";

const steps = [
  {
    icon: Sparkles,
    color: "bg-sun/20 text-sun",
    title: "Conte sua vibe",
    desc: "Responda algumas perguntinhas rápidas sobre sua viagem.",
  },
  {
    icon: Map,
    color: "bg-sea/15 text-sea",
    title: "Explore lugares que combinam com você",
    desc: "Veja praias, passeios e experiências selecionadas para o seu estilo.",
  },
  {
    icon: Heart,
    color: "bg-coral/15 text-coral",
    title: "Monte seu roteiro",
    desc: "Salve o que curtir, organize do seu jeito e compartilhe com a galera.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 md:py-28 bg-sand-soft">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto">
          <Reveal as="h2" className="font-display font-extrabold text-3xl md:text-5xl text-ink">
            Como funciona
          </Reveal>
          <Reveal as="p" delay={120} className="mt-4 text-ink/65 text-lg">
            Três passinhos curtos até seu roteiro estar pronto.
          </Reveal>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <Reveal
              key={s.title}
              delay={260 + i * 140}
              className="group bg-white rounded-3xl p-7 shadow-soft hover:shadow-soft-lg hover:-translate-y-1.5 transition-all duration-300 cursor-default"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center ${s.color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]`}
              >
                <s.icon size={26} strokeWidth={2.2} />
              </div>
              <div className="mt-5 text-xs font-bold uppercase tracking-wider text-ink/40">
                Passo {i + 1}
              </div>
              <h3 className="mt-1 font-display font-bold text-xl text-ink leading-tight">
                {s.title}
              </h3>
              <p className="mt-3 text-ink/65 leading-relaxed">{s.desc}</p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={720} className="mt-12 flex justify-center">
          <a
            href="#criar"
            className="press group inline-flex items-center justify-center rounded-full bg-ink px-7 py-3.5 text-base font-bold text-white hover:bg-sea hover:-translate-y-0.5 hover:shadow-soft-lg"
          >
            Começar agora
            <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
