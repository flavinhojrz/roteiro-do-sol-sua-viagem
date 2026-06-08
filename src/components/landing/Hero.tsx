import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PlaceCoverImage, PlaceCoverSkeleton } from "@/components/places/PlaceCoverImage";
import { selectPlacePreviews } from "@/lib/places/previews";
import { getPublishedPlaces, type PublishedPlace } from "@/lib/supabase/places";
import { SunBurst, Waves } from "./SunWaveDecor";

const floatingCardStyles = [
  {
    rotate: "-rotate-3",
    pos: "top-0 left-0 md:left-2",
    delay: "0s",
    enterDelay: "0.1s",
    duration: "6s",
  },
  {
    rotate: "rotate-2",
    pos: "top-24 right-0 md:right-4",
    delay: "1.4s",
    enterDelay: "0.25s",
    duration: "7s",
  },
  {
    rotate: "-rotate-2",
    pos: "bottom-0 left-8 md:left-20",
    delay: "2.6s",
    enterDelay: "0.4s",
    duration: "8s",
  },
];

export function Hero() {
  const { data: places = [], isLoading } = useQuery({
    queryKey: ["published-places"],
    queryFn: getPublishedPlaces,
  });
  const previewPlaces = useMemo(
    () =>
      selectPlacePreviews(places, {
        limit: 3,
        preferredSlugs: ["ponta-negra-morro-do-careca", "genipabu", "parque-das-dunas"],
      }),
    [places],
  );

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
          {floatingCardStyles.map((card, i) => {
            const place = previewPlaces[i] ?? null;

            return (
              <article
                key={place?.id ?? i}
                style={{
                  animationDelay: card.delay,
                  animationDuration: card.duration,
                }}
                className={`absolute w-56 md:w-64 bg-white rounded-3xl p-3 shadow-soft animate-float ${card.rotate} ${card.pos} hover:shadow-soft-lg transition-shadow`}
              >
                <div style={{ animationDelay: card.enterDelay }} className="animate-fade-up">
                  {isLoading ? (
                    <PlaceCoverSkeleton className="h-32 w-full rounded-2xl md:h-36" />
                  ) : (
                    <PlaceCoverImage
                      src={place?.coverImageUrl}
                      alt={place ? `Imagem de ${place.name}` : "Lugar em revisão"}
                      className="h-32 w-full rounded-2xl md:h-36"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  )}
                  <div className="px-2 pt-3 pb-1">
                    <h3 className="font-display font-bold text-ink text-base">
                      {place?.name ?? "Lugar em revisão"}
                    </h3>
                    <p className="text-xs text-ink/60 mt-0.5">{formatPlaceTags(place)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function formatPlaceTags(place: PublishedPlace | null) {
  if (!place) {
    return "Imagens reais em atualização";
  }

  const vibeLabels = place.vibes.slice(0, 3).map((vibe) => vibe.label);

  if (vibeLabels.length > 0) {
    return vibeLabels.join(" · ");
  }

  return place.category;
}
