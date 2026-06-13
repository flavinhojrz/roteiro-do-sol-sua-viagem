import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, Hourglass, MapPin, MapPinned, Sparkles, Wallet } from "lucide-react";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";
import { PlaceCoverImage } from "@/components/places/PlaceCoverImage";
import { SaveToRoteiroButton } from "@/components/places/SaveToRoteiroButton";
import { displayPrice, displayRegion, sunTip } from "@/lib/places/format";
import { safeHttpsUrl } from "@/lib/security/validation";
import { getPublishedPlaces, type PublishedPlace } from "@/lib/supabase/places";

export const Route = createFileRoute("/lugar/$slug")({
  head: () => ({
    meta: [{ title: "Detalhes do lugar — Roteiro do Sol" }],
  }),
  component: PlaceDetailPage,
});

function PlaceDetailPage() {
  const { slug } = Route.useParams();
  const {
    data: places = [],
    isError,
    isLoading,
  } = useQuery({
    queryKey: ["published-places"],
    queryFn: getPublishedPlaces,
  });

  const place = places.find((item) => item.slug === slug) ?? null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-sky">
      <SunBurst className="pointer-events-none absolute -top-10 -right-10 h-72 w-72 opacity-40 animate-sun-pulse md:h-96 md:w-96" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 h-24 w-[110%] animate-wave-drift md:h-32" />

      <div className="relative mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
        <Link
          to="/roteiro"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 transition-colors hover:text-coral"
        >
          <ArrowLeft size={16} /> Voltar para o roteiro
        </Link>

        {isLoading ? (
          <DetailStatus message="Carregando este lugar..." />
        ) : isError ? (
          <DetailStatus
            variant="error"
            message="Não conseguimos carregar este lugar agora. Tente novamente em instantes."
          />
        ) : !place ? (
          <DetailStatus message="Não encontramos esse lugar. Que tal voltar e explorar o roteiro?" />
        ) : (
          <PlaceDetail place={place} />
        )}
      </div>
    </div>
  );
}

function PlaceDetail({ place }: { place: PublishedPlace }) {
  const tip = sunTip(place);
  const googleMapsUrl = safeHttpsUrl(place.googleMapsUrl, [
    "google.com",
    "google.com.br",
    "goo.gl",
  ]);

  return (
    <article className="mt-6 overflow-hidden rounded-3xl bg-white shadow-soft animate-fade-up">
      <div className="relative h-60 md:h-80">
        <PlaceCoverImage
          src={place.coverImageUrl}
          alt={`Imagem de ${place.name}`}
          className="h-full w-full"
          loading="eager"
        />
        {place.imageCredit ? (
          <span className="absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)] rounded-full bg-ink/65 px-3 py-1 text-[0.68rem] font-bold text-white backdrop-blur">
            {place.imageCredit}
          </span>
        ) : null}
      </div>

      <div className="p-5 md:p-8">
        <span className="inline-flex items-center rounded-full bg-sea-soft px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-sea">
          {place.category}
        </span>
        <h1 className="mt-4 font-display text-2xl font-extrabold leading-tight text-ink md:text-4xl">
          {place.name}
        </h1>
        <p className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-sea">
          <MapPin size={15} className="shrink-0" />
          {displayRegion(place)}
        </p>

        <p className="mt-5 text-base leading-7 text-ink/75">{place.shortDescription}</p>
        {place.longDescription ? (
          <p className="mt-4 whitespace-pre-line text-base leading-7 text-ink/70">
            {place.longDescription}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {place.bestTime ? (
            <InfoTile icon={<Clock size={16} />} label="Melhor horário" value={place.bestTime} />
          ) : null}
          {place.averageDuration ? (
            <InfoTile
              icon={<Hourglass size={16} />}
              label="Duração média"
              value={place.averageDuration}
            />
          ) : null}
          <InfoTile
            icon={<Wallet size={16} />}
            label="Preço aproximado"
            value={displayPrice(place)}
          />
        </div>

        {place.vibes.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {place.vibes.map((vibe) => (
              <span
                key={vibe.id}
                className="inline-flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-xs font-extrabold text-ink/75"
              >
                {vibe.emoji ? <span>{vibe.emoji}</span> : null}
                {vibe.label}
              </span>
            ))}
          </div>
        ) : null}

        {tip ? (
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-sun/20 px-4 py-3">
            <Sparkles size={17} className="mt-0.5 shrink-0 text-coral" />
            <p className="text-sm font-semibold leading-6 text-ink">
              <span className="font-extrabold">Dica do Sol:</span> {tip}
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <SaveToRoteiroButton placeId={place.id} className="w-full sm:w-auto" />
          {googleMapsUrl ? (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-ink shadow-soft hover:shadow-soft-lg sm:w-auto"
            >
              <MapPinned size={16} /> Ver no mapa
            </a>
          ) : null}
          <Link
            to="/meu-roteiro"
            className="press inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-bold text-sea hover:text-coral sm:ml-auto sm:w-auto"
          >
            Ir para Meu Roteiro
          </Link>
        </div>
      </div>
    </article>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-sand-soft/70 px-4 py-3">
      <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink/55">
        <span className="text-coral">{icon}</span>
        {label}
      </span>
      <p className="mt-1 text-sm font-bold leading-5 text-ink">{value}</p>
    </div>
  );
}

function DetailStatus({
  message,
  variant = "default",
}: {
  message: string;
  variant?: "default" | "error";
}) {
  return (
    <div className="mt-10 rounded-3xl bg-white/80 px-6 py-12 text-center shadow-soft backdrop-blur animate-fade-up">
      <div
        className={`mx-auto h-14 w-14 rounded-2xl shadow-soft ${
          variant === "error"
            ? "bg-coral-soft text-coral"
            : "bg-gradient-to-br from-sun/50 via-aqua/40 to-sea-soft"
        }`}
        aria-hidden="true"
      />
      <p className="mt-5 text-base font-bold text-ink">{message}</p>
      <Link
        to="/roteiro"
        className="press mt-6 inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-ink shadow-soft hover:shadow-soft-lg"
      >
        Continuar explorando
      </Link>
    </div>
  );
}
