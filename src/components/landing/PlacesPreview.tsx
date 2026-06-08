import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PlaceCoverImage, PlaceCoverSkeleton } from "@/components/places/PlaceCoverImage";
import { selectPlacePreviews } from "@/lib/places/previews";
import { getPublishedPlaces, type PublishedPlace } from "@/lib/supabase/places";
import { Reveal } from "./Reveal";

const previewSkeletons = Array.from({ length: 4 }, (_, index) => index);

export function PlacesPreview() {
  const { data: places = [], isLoading } = useQuery({
    queryKey: ["published-places"],
    queryFn: getPublishedPlaces,
  });
  const previewPlaces = useMemo(
    () =>
      selectPlacePreviews(places, {
        limit: 4,
        preferredSlugs: [
          "ponta-negra-morro-do-careca",
          "genipabu",
          "parque-das-dunas",
          "forte-dos-reis-magos",
        ],
      }),
    [places],
  );

  return (
    <section id="lugares" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="max-w-2xl">
          <Reveal as="h2" className="font-display font-extrabold text-3xl md:text-5xl text-ink">
            Alguns lugares que podem aparecer no seu roteiro
          </Reveal>
          <Reveal as="p" delay={120} className="mt-4 text-ink/65 text-lg">
            Esses são só alguns exemplos. O seu roteiro muda conforme sua vibe.
          </Reveal>
        </div>

        <div className="mt-12 flex md:grid md:grid-cols-2 gap-5 md:gap-8 overflow-x-auto snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0 md:overflow-visible pb-4 md:pb-0">
          {isLoading
            ? previewSkeletons.map((index) => <PreviewCardSkeleton key={index} index={index} />)
            : previewPlaces.map((place, index) => (
                <PlacePreviewCard key={place.id} place={place} index={index} />
              ))}
        </div>
      </div>
    </section>
  );
}

function PlacePreviewCard({ place, index }: { place: PublishedPlace; index: number }) {
  const tags = getPreviewTags(place);

  return (
    <Reveal
      delay={260 + index * 130}
      as="article"
      className="group shrink-0 w-[85%] md:w-auto snap-start bg-white rounded-3xl overflow-hidden shadow-soft hover:shadow-soft-lg hover:-translate-y-2 transition-all duration-500 cursor-pointer"
    >
      <div className="relative h-56 md:h-72 overflow-hidden">
        <PlaceCoverImage
          src={place.coverImageUrl}
          alt={`Imagem de ${place.name}`}
          className="h-full w-full"
          imageClassName="transition-transform duration-[1200ms] ease-out group-hover:scale-110"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
      <div className="p-6">
        <h3 className="font-display font-bold text-xl md:text-2xl text-ink group-hover:text-coral transition-colors">
          {place.name}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full bg-sand px-3 py-1 text-xs font-semibold text-ink/75 transition-colors group-hover:bg-sun/30"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-4 text-ink/65 leading-relaxed">{place.shortDescription}</p>
      </div>
    </Reveal>
  );
}

function PreviewCardSkeleton({ index }: { index: number }) {
  return (
    <Reveal
      delay={260 + index * 130}
      as="article"
      className="shrink-0 w-[85%] md:w-auto snap-start bg-white rounded-3xl overflow-hidden shadow-soft"
    >
      <PlaceCoverSkeleton className="h-56 md:h-72" />
      <div className="space-y-3 p-6">
        <div className="h-6 w-2/3 rounded-full bg-sea-soft animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-sand animate-pulse" />
          <div className="h-6 w-24 rounded-full bg-sand animate-pulse" />
        </div>
        <div className="h-4 w-full rounded-full bg-sea-soft/70 animate-pulse" />
      </div>
    </Reveal>
  );
}

function getPreviewTags(place: PublishedPlace) {
  const tags = place.vibes.slice(0, 3).map((vibe) => {
    if (vibe.emoji) {
      return `${vibe.emoji} ${vibe.label}`;
    }

    return vibe.label;
  });

  return tags.length > 0 ? tags : [place.category];
}
