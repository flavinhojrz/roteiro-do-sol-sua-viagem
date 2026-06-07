import { SunBurst, Waves } from "./SunWaveDecor";
import { Reveal } from "./Reveal";

export function FinalCTA() {
  return (
    <section id="criar" className="relative overflow-hidden">
      <div className="relative bg-gradient-sky">
        <Waves
          className="absolute top-0 left-0 w-full h-20 rotate-180"
          color="var(--aqua)"
        />
        <SunBurst className="absolute -left-16 -bottom-16 w-72 h-72 opacity-60 animate-sun-pulse" />

        <div className="relative mx-auto max-w-3xl px-5 md:px-8 py-24 md:py-32 text-center">
          <Reveal as="h2" className="font-display font-extrabold text-3xl md:text-5xl text-ink leading-tight">
            <>
              Pronto para descobrir Natal{" "}
              <span className="bg-gradient-sun bg-clip-text text-transparent">
                do seu jeito?
              </span>
            </>
          </Reveal>
          <Reveal as="p" delay={140} className="mt-5 text-lg md:text-xl text-ink/70">
            Responda algumas perguntas e comece a montar seu roteiro em poucos
            minutos.
          </Reveal>
          <Reveal delay={300} className="mt-9 flex flex-col items-center gap-3">
            <a
              href="#criar"
              className="press group inline-flex items-center justify-center rounded-full bg-coral px-9 py-4 text-lg font-bold text-white shadow-coral hover:shadow-coral-lg hover:-translate-y-0.5"
            >
              Criar meu roteiro
              <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
            </a>
            <p className="text-sm text-ink/60">
              Sem cadastro chato. Só boas vibes. ☀️
            </p>
          </Reveal>
        </div>

        <Waves className="relative block w-[110%] h-20 animate-wave-drift" />

      </div>
    </section>
  );
}
