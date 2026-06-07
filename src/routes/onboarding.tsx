import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { StepShell } from "@/components/onboarding/StepShell";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { OptionCard } from "@/components/onboarding/OptionCard";
import {
  BUDGET_OPTIONS,
  COMPANY_OPTIONS,
  DAYS_OPTIONS,
  MAX_VIBES,
  RANGE_OPTIONS,
  VIBE_OPTIONS,
  pickTransition,
  type QuizAnswers,
} from "@/components/onboarding/quiz-data";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Monte seu roteiro — Roteiro do Sol" },
      {
        name: "description",
        content:
          "Responda algumas perguntas rápidas e descubra lugares em Natal/RN que combinam com sua vibe de viagem.",
      },
    ],
  }),
  component: OnboardingPage,
});

type Phase = "intro" | "quiz" | "preparing";
const TOTAL = 5;

function OnboardingPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<QuizAnswers>({ vibes: [] });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [vibeWarn, setVibeWarn] = useState(false);
  const navigate = useNavigate();

  // Preparing transition → navigate to /roteiro
  useEffect(() => {
    if (phase !== "preparing") return;
    const t = setTimeout(() => {
      navigate({ to: "/roteiro" });
    }, 3200);
    return () => clearTimeout(t);
  }, [phase, navigate]);

  const transition = useMemo(() => pickTransition(answers.vibes), [answers.vibes]);

  const goNext = () => {
    setDirection(1);
    if (step < TOTAL) setStep((s) => s + 1);
    else setPhase("preparing");
  };
  const goBack = () => {
    setDirection(-1);
    if (step === 1) setPhase("intro");
    else setStep((s) => s - 1);
  };

  const canContinue = (() => {
    switch (step) {
      case 1:
        return !!answers.company;
      case 2:
        return !!answers.days;
      case 3:
        return answers.vibes.length > 0;
      case 4:
        return !!answers.budget;
      case 5:
        return !!answers.range;
      default:
        return false;
    }
  })();

  if (phase === "intro")
    return (
      <Intro
        onStart={() => {
          setPhase("quiz");
          setStep(1);
        }}
      />
    );
  if (phase === "preparing") return <Preparing transition={transition} />;

  return (
    <StepShell>
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 hover:text-coral transition-colors"
        >
          <span className="text-lg">☀️</span> Roteiro do Sol
        </Link>
      </div>
      <ProgressBar current={step} total={TOTAL} />

      <div
        key={step}
        className={cn(
          "mt-8 md:mt-10",
          direction === 1 ? "animate-step-in-right" : "animate-step-in-left",
        )}
      >
        {step === 1 && (
          <StepContent
            title="Com quem você vem curtir Natal?"
            subtitle="Isso ajuda a gente a separar lugares que combinam melhor com seu momento."
          >
            <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
              {COMPANY_OPTIONS.map((o) => (
                <OptionCard
                  key={o.id}
                  icon={o.icon}
                  title={o.title}
                  description={o.description}
                  selected={answers.company === o.id}
                  onClick={() => setAnswers((a) => ({ ...a, company: o.id }))}
                />
              ))}
            </div>
          </StepContent>
        )}

        {step === 2 && (
          <StepContent
            title="Quantos dias você vai ficar por aqui?"
            subtitle="Assim a gente entende melhor o que cabe na sua viagem."
          >
            <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
              {DAYS_OPTIONS.map((o) => (
                <OptionCard
                  key={o.id}
                  icon={o.icon}
                  title={o.title}
                  description={o.description}
                  selected={answers.days === o.id}
                  onClick={() => setAnswers((a) => ({ ...a, days: o.id }))}
                />
              ))}
            </div>
          </StepContent>
        )}

        {step === 3 && (
          <StepContent
            title="Qual é a vibe da sua viagem?"
            subtitle={`Escolha até ${MAX_VIBES} opções para deixar seu roteiro mais certeiro.`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 md:gap-3">
              {VIBE_OPTIONS.map((o) => {
                const selected = answers.vibes.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setAnswers((a) => {
                        if (selected) {
                          setVibeWarn(false);
                          return { ...a, vibes: a.vibes.filter((v) => v !== o.id) };
                        }
                        if (a.vibes.length >= MAX_VIBES) {
                          setVibeWarn(true);
                          return a;
                        }
                        setVibeWarn(false);
                        return { ...a, vibes: [...a.vibes, o.id] };
                      });
                    }}
                    className={cn(
                      "press rounded-2xl border-2 bg-white px-3 py-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft-lg",
                      selected
                        ? "border-coral bg-coral-soft/50 shadow-coral"
                        : "border-transparent shadow-soft hover:border-sea/30",
                    )}
                  >
                    <div className="text-2xl md:text-3xl">{o.icon}</div>
                    <div className="mt-1.5 text-sm md:text-base font-semibold text-ink">
                      {o.title}
                    </div>
                  </button>
                );
              })}
            </div>
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "mt-4 text-sm text-center transition-all duration-300",
                vibeWarn ? "opacity-100 text-coral" : "opacity-0 h-0 overflow-hidden",
              )}
            >
              Para manter seu roteiro bem personalizado, escolha no máximo {MAX_VIBES} vibes.
            </div>
            <div className="mt-2 text-center text-xs font-semibold text-ink/55">
              {answers.vibes.length} de {MAX_VIBES} selecionadas
            </div>
          </StepContent>
        )}

        {step === 4 && (
          <StepContent
            title="Como você quer gastar nessa viagem?"
            subtitle="A gente usa isso para sugerir lugares que combinam melhor com seu estilo de viagem."
          >
            <div className="grid gap-3 md:gap-4">
              {BUDGET_OPTIONS.map((o) => (
                <OptionCard
                  key={o.id}
                  icon={o.icon}
                  title={o.title}
                  description={o.description}
                  selected={answers.budget === o.id}
                  onClick={() => setAnswers((a) => ({ ...a, budget: o.id }))}
                />
              ))}
            </div>
          </StepContent>
        )}

        {step === 5 && (
          <StepContent
            title="Você quer ficar só por Natal ou também conhecer lugares próximos?"
            subtitle="Algumas experiências incríveis ficam pertinho de Natal e podem valer o passeio."
          >
            <div className="grid gap-3 md:gap-4">
              {RANGE_OPTIONS.map((o) => (
                <OptionCard
                  key={o.id}
                  icon={o.icon}
                  title={o.title}
                  description={o.description}
                  selected={answers.range === o.id}
                  onClick={() => setAnswers((a) => ({ ...a, range: o.id }))}
                />
              ))}
            </div>
          </StepContent>
        )}
      </div>

      <NavBar onBack={goBack} onNext={goNext} canContinue={canContinue} isLast={step === TOTAL} />
    </StepShell>
  );
}

function StepContent({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display font-extrabold text-2xl md:text-4xl text-ink leading-tight">
        {title}
      </h1>
      <p className="mt-2 md:mt-3 text-ink/65 text-base md:text-lg">{subtitle}</p>
      <div className="mt-6 md:mt-8">{children}</div>
    </div>
  );
}

function NavBar({
  onBack,
  onNext,
  canContinue,
  isLast,
}: {
  onBack: () => void;
  onNext: () => void;
  canContinue: boolean;
  isLast: boolean;
}) {
  return (
    <>
      {/* Spacer to avoid overlap with fixed mobile bar */}
      <div className="h-4" />
      <div className="fixed md:static bottom-0 inset-x-0 z-30 md:mt-10 md:z-auto">
        <div className="md:hidden h-6 bg-gradient-to-t from-sand-soft to-transparent" />
        <div className="bg-sand-soft/95 backdrop-blur md:bg-transparent md:backdrop-blur-0 px-5 md:px-0 pt-3 pb-5 md:py-0 border-t md:border-0 border-white/60 flex items-center justify-between gap-3 mx-auto max-w-2xl">
          <button
            type="button"
            onClick={onBack}
            className="press inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm md:text-base font-bold text-ink shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5"
          >
            <ArrowLeft size={18} /> Voltar
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canContinue}
            className={cn(
              "press group inline-flex items-center gap-2 rounded-full px-6 md:px-7 py-3 text-sm md:text-base font-bold text-white transition-all",
              canContinue
                ? "bg-coral shadow-coral hover:shadow-coral-lg hover:-translate-y-0.5"
                : "bg-ink/20 cursor-not-allowed",
            )}
          >
            {isLast ? "Preparar meu roteiro" : "Continuar"}
            <ArrowRight
              size={18}
              className={cn(
                "transition-transform duration-300",
                canContinue && "group-hover:translate-x-1",
              )}
            />
          </button>
        </div>
      </div>
    </>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen bg-gradient-sky overflow-hidden">
      <SunBurst className="pointer-events-none absolute -top-12 -right-12 w-72 h-72 md:w-[28rem] md:h-[28rem] opacity-60 animate-sun-pulse" />
      <SunBurst className="pointer-events-none absolute -bottom-24 -left-20 w-64 h-64 opacity-30 animate-sun-pulse" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 w-[110%] h-24 md:h-32 animate-wave-drift" />

      <div className="relative mx-auto max-w-2xl px-5 md:px-8 min-h-screen flex flex-col items-center justify-center text-center py-16">
        <Link
          to="/"
          className="absolute top-6 left-5 md:left-8 inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 hover:text-coral transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>

        <span className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-4 py-1.5 text-xs font-bold text-sea uppercase tracking-wider animate-fade-up">
          🌴 Natal / RN
        </span>
        <h1
          style={{ animationDelay: "0.1s" }}
          className="mt-5 font-display font-extrabold text-3xl sm:text-4xl md:text-5xl leading-[1.1] text-ink animate-fade-up"
        >
          Bora montar seu roteiro{" "}
          <span className="bg-gradient-sun bg-clip-text text-transparent">em Natal?</span>
        </h1>
        <p
          style={{ animationDelay: "0.25s" }}
          className="mt-4 text-base md:text-lg text-ink/70 max-w-lg leading-relaxed animate-fade-up"
        >
          Responda algumas perguntas rápidas e a gente separa lugares que combinam com sua vibe de
          viagem.
        </p>

        <div
          style={{ animationDelay: "0.4s" }}
          className="mt-8 flex flex-col items-center gap-3 animate-fade-up"
        >
          <button
            type="button"
            onClick={onStart}
            className="press group inline-flex items-center justify-center rounded-full bg-coral px-10 py-4 text-lg font-bold text-white shadow-coral hover:shadow-coral-lg hover:-translate-y-0.5"
          >
            Começar
            <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1.5">
              →
            </span>
          </button>
          <p className="text-sm text-ink/60">Leva menos de 2 minutos ☀️</p>
        </div>

        {/* Decorative mini cards */}
        <div style={{ animationDelay: "0.55s" }} className="mt-12 flex gap-3 animate-fade-up">
          {["🌊", "🌅", "🏖️", "🥥", "🧭"].map((e, i) => (
            <div
              key={i}
              style={{ animationDelay: `${i * 0.3}s`, animationDuration: "6s" }}
              className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white shadow-soft flex items-center justify-center text-2xl animate-float"
            >
              {e}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Preparing({ transition }: { transition: ReturnType<typeof pickTransition> }) {
  return (
    <div className="relative min-h-screen bg-gradient-sky overflow-hidden flex items-center justify-center px-5">
      <SunBurst className="pointer-events-none absolute -top-10 -right-10 w-80 h-80 md:w-[32rem] md:h-[32rem] opacity-60 animate-sun-pulse" />
      <SunBurst className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 opacity-35 animate-sun-pulse" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 w-[110%] h-28 md:h-36 animate-wave-drift" />

      <div className="relative text-center max-w-xl">
        <div className="flex justify-center gap-3 md:gap-4 mb-8">
          {transition.emojis.map((e, i) => (
            <div
              key={i}
              style={{
                animationDelay: `${i * 0.18}s`,
                animationDuration: "2.4s",
              }}
              className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white shadow-soft-lg flex items-center justify-center text-3xl md:text-4xl animate-float"
            >
              {e}
            </div>
          ))}
        </div>

        <h2 className="font-display font-extrabold text-2xl md:text-4xl text-ink leading-tight animate-fade-up">
          {transition.title}
        </h2>
        <p
          style={{ animationDelay: "0.25s" }}
          className="mt-4 text-ink/65 text-base md:text-lg animate-fade-up"
        >
          Estamos separando lugares que combinam com sua viagem...
        </p>

        <div className="mt-8 mx-auto w-56 h-1.5 rounded-full bg-white/70 overflow-hidden">
          <div className="h-full bg-gradient-sun animate-preparing-bar" />
        </div>
      </div>
    </div>
  );
}
