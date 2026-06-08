import type { PublishedPlace } from "@/lib/supabase/places";

export const CLASSIC_PREVIEW_SLUGS = [
  "ponta-negra-morro-do-careca",
  "genipabu",
  "praia-da-pipa",
  "forte-dos-reis-magos",
  "maracajau-parrachos",
];

const quizToPlaceVibes: Record<string, string[]> = {
  praias: ["beaches"],
  fotos: ["photos"],
  "por-do-sol": ["sunset"],
  aventura: ["adventure"],
  descanso: ["relax"],
  cultura: ["history_culture"],
  artesanato: ["history_culture", "gastronomy"],
  gastronomia: ["gastronomy"],
  "bate-volta": ["day_trips"],
  barato: ["cheap"],
  natureza: ["nature"],
  romantico: ["romantic"],
};

type SelectPlacePreviewsOptions = {
  limit?: number;
  selectedVibes?: string[];
  preferredSlugs?: string[];
};

export function selectPlacePreviews(
  places: PublishedPlace[],
  {
    limit = 5,
    selectedVibes = [],
    preferredSlugs = CLASSIC_PREVIEW_SLUGS,
  }: SelectPlacePreviewsOptions = {},
) {
  const placesWithImages = places.filter((place) => Boolean(place.coverImageUrl));
  const selectedPlaceVibes = new Set(selectedVibes.flatMap((vibe) => quizToPlaceVibes[vibe] ?? []));

  if (selectedPlaceVibes.size === 0) {
    return pickPreferredPlaces(placesWithImages, preferredSlugs, limit);
  }

  const preferredSlugRank = new Map(preferredSlugs.map((slug, index) => [slug, index]));
  const scoredPlaces = placesWithImages
    .map((place) => ({
      place,
      score: place.vibes.reduce(
        (score, vibe) => score + (selectedPlaceVibes.has(vibe.id) ? 1 : 0),
        0,
      ),
      preferredRank: preferredSlugRank.get(place.slug) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      if (left.preferredRank !== right.preferredRank) {
        return left.preferredRank - right.preferredRank;
      }

      return left.place.name.localeCompare(right.place.name);
    })
    .map(({ place }) => place);

  return uniquePlaces([
    ...scoredPlaces,
    ...pickPreferredPlaces(placesWithImages, preferredSlugs),
  ]).slice(0, limit);
}

function pickPreferredPlaces(
  places: PublishedPlace[],
  preferredSlugs: string[],
  limit = places.length,
) {
  const bySlug = new Map(places.map((place) => [place.slug, place]));
  const preferredPlaces = preferredSlugs
    .map((slug) => bySlug.get(slug))
    .filter((place): place is PublishedPlace => Boolean(place));

  return uniquePlaces([...preferredPlaces, ...places]).slice(0, limit);
}

function uniquePlaces(places: PublishedPlace[]) {
  const seenIds = new Set<string>();

  return places.filter((place) => {
    if (seenIds.has(place.id)) {
      return false;
    }

    seenIds.add(place.id);
    return true;
  });
}
