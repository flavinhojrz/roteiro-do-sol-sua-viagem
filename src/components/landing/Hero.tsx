import { Link } from "@tanstack/react-router";
import pontaNegra from "@/assets/places/ponta-negra.jpg";
import genipabu from "@/assets/places/genipabu.jpg";
import parqueDunas from "@/assets/places/parque-dunas.jpg";
import { SunBurst, Waves } from "./SunWaveDecor";

const floatingCards = [
  {
    img: pontaNegra,
    title: "Ponta Negra",
    tags: "Praia · Fotos · Fim de tarde",
    rotate: "-rotate-3",
    pos: "top-0 left-0 md:left-2",
    delay: "0s",
    enterDelay: "0.1s",
    duration: "6s",
  },
  {
    img: genipabu,
    title: "Genipabu",
    tags: "Bate-volta · Dunas · Aventura",
    rotate: "rotate-2",
    pos: "top-24 right-0 md:right-4",
    delay: "1.4s",
    enterDelay: "0.25s",
    duration: "7s",
  },
  {
    img: parqueDunas,
    title: "Parque das Dunas",
    tags: "Natureza · Descanso · Família",
    rotate: "-rotate-2",
    pos: "bottom-0 left-8 md:left-20",
    delay: "2.6s",
    enterDelay: "0.4s",
    duration: "8s",
  },
];

export function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden bg-gradient-sky pt-10 pb-24 md:pt-20 md:pb-32"
    >
      <SunBurst className="absolute -top-10 -right-10 w-64 h-64 md:w-96 md:h-96 opacity-70 animate-sun-pulse" />
      <Waves className="absolute bottom-0 left-0 w-[110%] h-24 md:h-32 animate-wave-drift" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8 grid md:grid-cols-2 gap-12 md:gap-8 items-center">
        <div className="text-center md:text-left animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-4 py-1.5 text-xs font-bold text-sea uppercase tracking-wider">
            🌴 Natal / RN
          </span>
          <h1 className="mt-5 font-display font-extrabold text-4xl sm:text-5xl md:text-6xl leading-[1.05] text-ink">
            Descubra Natal <br className="hidden sm:block" />
            <span className="bg-gradient-sun bg-clip-text text-transparent">na sua vibe</span>
          </h1>
          <p className="mt-5 text-lg md:text-xl text-ink/70 max-w-xl mx-auto md:mx-0 leading-relaxed">
            Monte um roteiro personalizado com praias, passeios e experiências que combinam com seu
            jeito de viajar.
          </p>

          <div className="mt-8 flex flex-col items-center md:items-start gap-3">
            <Link
              to="/onboarding"
              className="press group inline-flex items-center justify-center rounded-full bg-coral px-8 py-4 text-base md:text-lg font-bold text-white shadow-coral hover:shadow-coral-lg hover:-translate-y-0.5"
            >
              Criar meu roteiro
              <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1.5">
                →
              </span>
            </Link>
            <p className="text-sm text-ink/60">Leva menos de 2 minutos para começar ☀️</p>
          </div>
        </div>

        <div className="relative h-[440px] md:h-[520px]">
          {floatingCards.map((c, i) => (
            <article
              key={c.title}
              style={{
                animationDelay: c.delay,
                animationDuration: c.duration,
              }}
              className={`absolute w-56 md:w-64 bg-white rounded-3xl p-3 shadow-soft animate-float ${c.rotate} ${c.pos} hover:shadow-soft-lg transition-shadow`}
            >
              <div style={{ animationDelay: c.enterDelay }} className="animate-fade-up">
                <img
                  src={c.img}
                  alt={c.title}
                  width={1024}
                  height={768}
                  className="w-full h-32 md:h-36 object-cover rounded-2xl"
                  loading={i === 0 ? "eager" : "lazy"}
                />
                <div className="px-2 pt-3 pb-1">
                  <h3 className="font-display font-bold text-ink text-base">{c.title}</h3>
                  <p className="text-xs text-ink/60 mt-0.5">{c.tags}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
