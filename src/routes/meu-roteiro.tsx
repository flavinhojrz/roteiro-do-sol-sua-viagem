import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, MapPin, Pencil, Plus, Share2, Trash2, Wallet } from "lucide-react";
import { useMemo } from "react";
import { SunBurst, Waves } from "@/components/landing/SunWaveDecor";
import { PlaceCoverImage } from "@/components/places/PlaceCoverImage";
import { displayPrice, displayRegion } from "@/lib/places/format";
import { loadTravelAnswers } from "@/lib/recommendations/answers-storage";
import { personalizedLimitForDays } from "@/lib/recommendations/personalize";
import { recommendPlaces } from "@/lib/recommendations/recommend-places";
import { clearEditingItinerary, useEditingItinerary } from "@/lib/roteiro/editing-state";
import { clearSavedPlaces, removeSavedPlace, useSavedPlaceIds } from "@/lib/roteiro/saved-places";
import { getPublishedPlaces, type PublishedPlace } from "@/lib/supabase/places";

export const Route = createFileRoute("/meu-roteiro")({
  head: () => ({
    meta: [
      { title: "Meu Roteiro — Roteiro do Sol" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MeuRoteiroPage,
});

function MeuRoteiroPage() {
  const { data: places = [], isLoading } = useQuery({
    queryKey: ["published-places"],
    queryFn: getPublishedPlaces,
  });
  const savedIds = useSavedPlaceIds();
  const editing = useEditingItinerary();
  const navigate = useNavigate();
  const answers = useMemo(() => loadTravelAnswers(), []);

  const handleCreateNew = () => {
    clearSavedPlaces();
    clearEditingItinerary();
    navigate({ to: "/onboarding" });
  };

  const { fits, ifTime } = useMemo(() => {
    const savedPlaces = places.filter((place) => savedIds.includes(place.id));
    // Ordena os lugares salvos pela mesma lógica de recomendação e separa o que
    // cabe no tempo de viagem do que fica como "se der tempo".
    const ranked = recommendPlaces(savedPlaces, answers).map((item) => item.place);
    const limit = personalizedLimitForDays(answers.days);
    return { fits: ranked.slice(0, limit), ifTime: ranked.slice(limit) };
  }, [places, savedIds, answers]);

  const isEmpty = savedIds.length === 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-sky">
      <SunBurst className="pointer-events-none absolute -top-10 -right-10 h-72 w-72 opacity-40 animate-sun-pulse md:h-96 md:w-96" />
      <Waves className="pointer-events-none absolute bottom-0 left-0 h-24 w-[110%] animate-wave-drift md:h-32" />

      <div className="relative mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
        <Link
          to="/roteiro"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/70 transition-colors hover:text-coral"
        >
          <ArrowLeft size={16} /> Continuar explorando
        </Link>

        <div className="mt-8 animate-fade-up">
          <span className="inline-flex items-center rounded-full bg-white/70 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-sea backdrop-blur">
            ☀️ Meu Roteiro
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold leading-tight text-ink md:text-5xl">
            {editing
              ? editing.name || "Editando seu roteiro"
              : isEmpty
                ? "Seu roteiro está só começando"
                : "Os lugares que você escolheu"}
          </h1>
          {editing ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sun/25 px-3 py-1 text-xs font-bold text-ink">
              <Pencil size={12} /> Editando um roteiro salvo — suas alterações atualizam o mesmo
              roteiro.
            </p>
          ) : null}
          {!isEmpty ? (
            <p className="mt-3 max-w-xl text-base text-ink/65 md:text-lg">
              {savedIds.length} {savedIds.length === 1 ? "lugar salvo" : "lugares salvos"} para a
              sua viagem.
            </p>
          ) : null}
        </div>

        {isLoading && !isEmpty ? (
          <p className="mt-12 text-center font-bold text-ink/60">Carregando seu roteiro...</p>
        ) : isEmpty ? (
          <EmptyRoteiro />
        ) : (
          <div className="mt-10 space-y-12">
            <RoteiroSection
              title="Cabe na sua viagem"
              description="Dá pra encaixar com tranquilidade no seu tempo."
              places={fits}
            />
            {ifTime.length > 0 ? (
              <RoteiroSection
                title="Se der tempo"
                description="Ótimos para incluir caso sobre um espaço na agenda."
                places={ifTime}
              />
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/roteiro"
                className="press inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-ink shadow-soft hover:shadow-soft-lg"
              >
                Continuar explorando
              </Link>
              <Link
                to="/compartilhar"
                className="press inline-flex items-center justify-center gap-2 rounded-full bg-gradient-sun px-6 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg"
              >
                <Share2 size={16} /> {editing ? "Salvar alterações" : "Salvar e compartilhar"}
              </Link>
            </div>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/meus-roteiros" className="text-sm font-bold text-sea hover:text-coral">
                Ver meus roteiros salvos
              </Link>
              <span className="hidden text-ink/30 sm:inline">•</span>
              <button
                type="button"
                onClick={handleCreateNew}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-ink/60 hover:text-coral"
              >
                <Plus size={14} /> Criar novo roteiro
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoteiroSection({
  title,
  description,
  places,
}: {
  title: string;
  description: string;
  places: PublishedPlace[];
}) {
  if (places.length === 0) return null;

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-extrabold text-ink md:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-ink/60 md:text-base">{description}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {places.map((place) => (
          <SavedPlaceCard key={place.id} place={place} />
        ))}
      </div>
    </div>
  );
}

function SavedPlaceCard({ place }: { place: PublishedPlace }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-soft">
      <Link
        to="/lugar/$slug"
        params={{ slug: place.slug }}
        className="relative block h-36 overflow-hidden bg-sea-soft"
      >
        <PlaceCoverImage
          src={place.coverImageUrl}
          alt={`Imagem de ${place.name}`}
          className="h-full w-full"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link to="/lugar/$slug" params={{ slug: place.slug }}>
          <h3 className="font-display text-lg font-extrabold leading-tight text-ink hover:text-coral">
            {place.name}
          </h3>
        </Link>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-sea">
          <MapPin size={14} className="shrink-0" />
          <span className="truncate">{displayRegion(place)}</span>
        </p>
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
        <button
          type="button"
          onClick={() => removeSavedPlace(place.id)}
          className="press mt-4 inline-flex items-center justify-center gap-1.5 rounded-full bg-sand-soft px-4 py-2 text-xs font-bold text-ink/70 hover:bg-coral-soft hover:text-coral"
        >
          <Trash2 size={14} /> Remover do roteiro
        </button>
      </div>
    </article>
  );
}

function EmptyRoteiro() {
  return (
    <div className="mt-12 rounded-3xl bg-white/80 px-6 py-14 text-center shadow-soft backdrop-blur animate-fade-up">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sun/50 via-aqua/40 to-sea-soft text-3xl shadow-soft">
        🏖️
      </div>
      <h2 className="mt-5 font-display text-xl font-extrabold text-ink">
        Seu roteiro ainda está vazio
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-ink/65">
        Escolha alguns lugares para começar. Toque em “Quero conhecer” nas recomendações e eles
        aparecem aqui.
      </p>
      <Link
        to="/roteiro"
        className="press mt-6 inline-flex items-center justify-center rounded-full bg-gradient-sun px-6 py-3 text-sm font-extrabold text-ink shadow-coral hover:shadow-coral-lg"
      >
        Explorar lugares
      </Link>
    </div>
  );
}
