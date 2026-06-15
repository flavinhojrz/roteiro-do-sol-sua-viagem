import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, MapPin, Wallet } from "lucide-react";
import { ReactionBar } from "@/components/itinerary/ReactionBar";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";
import { PlaceCoverImage } from "@/components/places/PlaceCoverImage";
import { displayPrice, displayRegion } from "@/lib/places/format";
import {
  buildPublicItineraryMeta,
  publicItineraryHeadLinks,
  publicItineraryHeadMeta,
} from "@/lib/seo/public-itinerary-meta";
import { resolveRequestOrigin } from "@/lib/seo/request-origin";
import {
  getPublicItinerary,
  ItineraryNotFoundError,
  type PublicItinerary,
} from "@/lib/supabase/itineraries";
import type { PublishedPlace } from "@/lib/supabase/places";

export const Route = createFileRoute("/r/$slug")({
  // Roda no servidor (SSR) no primeiro acesso, então os metadados ficam no HTML
  // inicial que o WhatsApp/Telegram/redes sociais leem — sem depender do JS.
  loader: async ({ params }) => {
    const origin = resolveRequestOrigin();
    let itinerary: PublicItinerary | null = null;
    let notFound = false;
    try {
      itinerary = await getPublicItinerary(params.slug);
    } catch (error) {
      if (error instanceof ItineraryNotFoundError) {
        notFound = true;
      }
      // Outros erros: deixamos o componente refazer a busca e exibir o estado.
    }
    return { itinerary, notFound, origin };
  },
  head: ({ params, loaderData }) => {
    const meta = buildPublicItineraryMeta(
      loaderData?.itinerary ?? null,
      params.slug,
      loaderData?.origin ?? "",
    );
    // Roteiro encontrado vira indexável; ausente/privado permanece noindex.
    const indexable = Boolean(loaderData?.itinerary);
    return {
      meta: publicItineraryHeadMeta(meta, indexable),
      links: publicItineraryHeadLinks(meta),
    };
  },
  component: PublicItineraryPage,
});

function PublicItineraryPage() {
  const { slug } = Route.useParams();
  const loaderData = Route.useLoaderData();
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-itinerary", slug],
    queryFn: () => getPublicItinerary(slug),
    retry: false,
    // Reaproveita o roteiro já buscado no loader (SSR), evitando flash de loading.
    initialData: loaderData.itinerary ?? undefined,
  });

  const notFound = error instanceof ItineraryNotFoundError;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-sky">
      <SunBurst className="pointer-events-none absolute -top-10 -right-10 h-72 w-72 opacity-40 animate-sun-pulse md:h-96 md:w-96" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 h-24 w-[110%] animate-wave-drift md:h-32" />

      <div className="relative mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-sea">
          <span className="text-lg">☀️</span> Roteiro do Sol
        </Link>

        {isLoading ? (
          <PublicStatus message="Abrindo este roteiro..." />
        ) : notFound ? (
          <PublicStatus message="Esse roteiro não está disponível. Ele pode ter sido removido ou ser privado." />
        ) : error ? (
          <PublicStatus
            variant="error"
            message="Não conseguimos carregar este roteiro agora. Tente novamente em instantes."
          />
        ) : data ? (
          <PublicItineraryView itinerary={data} />
        ) : null}
      </div>
    </div>
  );
}

function PublicItineraryView({ itinerary }: { itinerary: PublicItinerary }) {
  const title = itinerary.name ? `Roteiro de ${itinerary.name} ☀️` : "Roteiro em Natal ☀️";

  return (
    <div className="mt-8 animate-fade-up">
      <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-sea backdrop-blur">
        Roteiro compartilhado
      </span>
      <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight text-ink md:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-xl text-base text-ink/65 md:text-lg">
        {itinerary.places.length}{" "}
        {itinerary.places.length === 1 ? "lugar selecionado" : "lugares selecionados"} para curtir
        Natal e arredores.
      </p>

      {itinerary.places.length === 0 ? (
        <PublicStatus message="Este roteiro ainda não tem lugares." />
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {itinerary.places.map((place) => (
            <PublicPlaceCard key={place.id} place={place} />
          ))}
        </div>
      )}

      {itinerary.places.length > 0 ? <ReactionBar itineraryId={itinerary.id} /> : null}

      <div className="mt-8 rounded-3xl bg-white p-7 text-center shadow-soft md:p-10">
        <h2 className="font-display text-2xl font-extrabold text-ink md:text-3xl">
          Curtiu essa vibe?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-ink/65">
          Monte o seu próprio roteiro de Natal com praias, passeios e experiências que combinam com
          você.
        </p>
        <Link
          to="/onboarding"
          className="press mt-6 inline-flex items-center justify-center rounded-full bg-gradient-sun px-8 py-3.5 text-base font-extrabold text-ink shadow-coral hover:shadow-coral-lg"
        >
          Criar meu roteiro
        </Link>
      </div>
    </div>
  );
}

function PublicPlaceCard({ place }: { place: PublishedPlace }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-soft">
      <div className="relative h-40 overflow-hidden bg-sea-soft">
        <PlaceCoverImage
          src={place.coverImageUrl}
          alt={`Imagem de ${place.name}`}
          className="h-full w-full"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-lg font-extrabold leading-tight text-ink">{place.name}</h3>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-sea">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">{displayRegion(place)}</span>
        </p>
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink/65">{place.shortDescription}</p>
        <div className="mt-3 grid gap-1.5 text-sm text-ink/70">
          {place.averageDuration ? (
            <span className="inline-flex items-center gap-2">
              <Clock size={14} className="shrink-0 text-coral" />
              {place.averageDuration}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <Wallet size={14} className="shrink-0 text-coral" />
            {displayPrice(place)}
          </span>
        </div>
      </div>
    </article>
  );
}

function PublicStatus({
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
        to="/onboarding"
        className="press mt-6 inline-flex items-center justify-center rounded-full bg-gradient-sun px-6 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg"
      >
        Criar meu roteiro
      </Link>
    </div>
  );
}
