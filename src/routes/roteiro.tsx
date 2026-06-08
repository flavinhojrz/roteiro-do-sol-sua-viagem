import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Clock, MapPin, Wallet } from "lucide-react";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";
import { PlaceCoverImage } from "@/components/places/PlaceCoverImage";
import { Button } from "@/components/ui/button";
import { getPublishedPlaces, type PublishedPlace } from "@/lib/supabase/places";

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
  const {
    data: places = [],
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["published-places"],
    queryFn: getPublishedPlaces,
  });

  return (
    <div className="relative min-h-screen bg-gradient-sky overflow-hidden">
      <SunBurst className="pointer-events-none absolute -top-10 -right-10 w-72 h-72 md:w-96 md:h-96 opacity-50 animate-sun-pulse" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 w-[110%] h-24 md:h-32 animate-wave-drift" />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8 py-12 md:py-20">
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
            Esses são os primeiros lugares reais da nossa base em Natal e arredores.
          </p>
        </div>

        <section className="mt-12" aria-live="polite">
          {isLoading ? (
            <CatalogStatus message="Carregando lugares que combinam com sua vibe..." />
          ) : null}

          {isError ? (
            <CatalogStatus
              message="Não conseguimos carregar os lugares agora. Tente novamente em instantes."
              variant="error"
            />
          ) : null}

          {!isLoading && !isError && places.length === 0 ? (
            <CatalogStatus message="Ainda estamos preparando os primeiros lugares do Roteiro do Sol." />
          ) : null}

          {!isLoading && !isError && places.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {places.map((place, index) => (
                <PlaceCard key={place.id} place={place} index={index} />
              ))}
            </div>
          ) : null}
        </section>

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

function CatalogStatus({
  message,
  variant = "default",
}: {
  message: string;
  variant?: "default" | "error";
}) {
  const iconClassName =
    variant === "error"
      ? "bg-coral-soft text-coral"
      : "bg-gradient-to-br from-sun/50 via-aqua/40 to-sea-soft text-ink";

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur px-6 py-10 text-center shadow-soft animate-fade-up">
      <div
        className={`mx-auto h-14 w-14 rounded-2xl shadow-soft ${iconClassName}`}
        aria-hidden="true"
      />
      <p className="mt-5 text-base font-bold text-ink">{message}</p>
    </div>
  );
}

function PlaceCard({ place, index }: { place: PublishedPlace; index: number }) {
  const displayRegion = place.region ?? place.locationLabel ?? "Natal e arredores";
  const displayBestTime = place.bestTime ?? "Horário a confirmar";
  const displayPrice = place.approximatePrice ?? formatPriceLevel(place.priceLevel);
  const tags =
    place.vibes.length > 0
      ? place.vibes
      : [
          {
            id: `${place.id}-category`,
            label: place.category,
            emoji: null,
            weight: 0,
          },
        ];

  return (
    <article
      style={{ animationDelay: `${0.1 + index * 0.08}s` }}
      className="animate-fade-up flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-soft transition-transform duration-300 hover:-translate-y-1 hover:shadow-soft-lg"
    >
      <div className="relative h-44 shrink-0 overflow-hidden bg-sea-soft">
        <PlaceCoverImage
          src={place.coverImageUrl}
          alt={`Imagem de ${place.name}`}
          className="h-full w-full"
        />

        {place.imageCredit ? (
          <span className="absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)] rounded-full bg-ink/65 px-3 py-1 text-[0.68rem] font-bold text-white backdrop-blur">
            {place.imageCredit}
          </span>
        ) : null}
      </div>

      <div className="flex min-h-[21rem] flex-1 flex-col p-5 md:p-6">
        <div className="flex flex-1 flex-col gap-5">
          <div className="space-y-3">
            <h2 className="font-display text-xl font-extrabold leading-tight text-ink">
              {place.name}
            </h2>
            <p className="inline-flex max-w-full items-center gap-2 text-sm font-bold leading-5 text-sea">
              <MapPin size={15} className="shrink-0" />
              <span className="truncate">{displayRegion}</span>
            </p>
          </div>

          <p className="line-clamp-3 text-sm leading-6 text-ink/65">{place.shortDescription}</p>

          <div className="grid gap-3 text-sm leading-6 text-ink/70">
            <span className="inline-flex items-start gap-2.5">
              <Clock size={16} className="mt-0.5 shrink-0 text-coral" />
              <span>{displayBestTime}</span>
            </span>
            <span className="inline-flex items-start gap-2.5">
              <Wallet size={16} className="mt-0.5 shrink-0 text-coral" />
              <span>{displayPrice}</span>
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-sea-soft px-3 py-1 text-xs font-extrabold text-ink"
              >
                {tag.emoji ? <span>{tag.emoji}</span> : null}
                <span className="truncate">{tag.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-6">
          <Button
            type="button"
            className="press w-full rounded-full bg-gradient-sun text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg"
          >
            Ver detalhes
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </article>
  );
}

function formatPriceLevel(priceLevel: string) {
  if (!priceLevel) {
    return "Preço a confirmar";
  }

  return priceLevel;
}
