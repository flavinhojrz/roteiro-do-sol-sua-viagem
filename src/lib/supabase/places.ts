import { supabase } from "./client";

export type PublishedPlace = {
  id: string;
  name: string;
  slug: string;
  category: string;
  region: string | null;
  locationLabel: string | null;
  shortDescription: string;
  longDescription: string | null;
  bestTime: string | null;
  averageDuration: string | null;
  priceLevel: string;
  approximatePrice: string | null;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  isInsideNatal: boolean;
  isDayTrip: boolean;
  coverImageUrl: string | null;
  imageCredit: string | null;
  imageLicense: string | null;
  imageSourceUrl: string | null;
  vibes: Array<{
    id: string;
    label: string;
    emoji: string | null;
    weight: number;
  }>;
};

type PlaceImageRow = {
  id: string;
  image_url: string | null;
  alt_text: string | null;
  credit_text: string | null;
  license: string | null;
  source_url: string | null;
  is_cover: boolean | null;
  sort_order: number | null;
};

type VibeRow = {
  id: string;
  label: string;
  emoji: string | null;
  sort_order: number | null;
};

type PlaceVibeRow = {
  weight: number | null;
  vibes: VibeRow | VibeRow[] | null;
};

type PlaceRow = {
  id: string;
  name: string;
  slug: string;
  category: string;
  region: string | null;
  location_label: string | null;
  short_description: string;
  long_description: string | null;
  best_time: string | null;
  average_duration: string | null;
  price_level: string;
  approximate_price: string | null;
  google_maps_url: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  is_inside_natal: boolean | null;
  is_day_trip: boolean | null;
  status: string;
  place_images?: PlaceImageRow[] | null;
  place_vibes?: PlaceVibeRow[] | null;
};

type SupabaseLikeError = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
};

const placeColumns = `
  id,
  name,
  slug,
  category,
  region,
  location_label,
  short_description,
  long_description,
  best_time,
  average_duration,
  price_level,
  approximate_price,
  google_maps_url,
  latitude,
  longitude,
  is_inside_natal,
  is_day_trip,
  status
`;

const placeWithRelationsColumns = `
  ${placeColumns},
  place_images (
    id,
    image_url,
    alt_text,
    credit_text,
    license,
    source_url,
    is_cover,
    sort_order
  ),
  place_vibes (
    weight,
    vibes (
      id,
      label,
      emoji,
      sort_order
    )
  )
`;

export async function getPublishedPlaces(): Promise<PublishedPlace[]> {
  const { data, error } = await supabase
    .from("places")
    .select(placeWithRelationsColumns)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) {
    if (isRelationshipError(error)) {
      return getPublishedPlacesWithoutRelations();
    }

    throw new Error(`Erro ao buscar lugares publicados: ${error.message}`);
  }

  return (data ?? []).map(mapPublishedPlace);
}

async function getPublishedPlacesWithoutRelations(): Promise<PublishedPlace[]> {
  // TODO: Remover este fallback quando as relações place_images/place_vibes estiverem confirmadas no schema cache do Supabase.
  const { data, error } = await supabase
    .from("places")
    .select(placeColumns)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar lugares publicados: ${error.message}`);
  }

  return ((data ?? []) as PlaceRow[]).map((place) =>
    mapPublishedPlace({
      ...place,
      place_images: [],
      place_vibes: [],
    }),
  );
}

function mapPublishedPlace(place: PlaceRow): PublishedPlace {
  const images = [...(place.place_images ?? [])].sort(compareBySortOrder);
  const coverImage = images.find((image) => image.is_cover) ?? images[0] ?? null;

  return {
    id: place.id,
    name: place.name,
    slug: place.slug,
    category: place.category,
    region: place.region,
    locationLabel: place.location_label,
    shortDescription: place.short_description,
    longDescription: place.long_description,
    bestTime: place.best_time,
    averageDuration: place.average_duration,
    priceLevel: place.price_level,
    approximatePrice: place.approximate_price,
    googleMapsUrl: place.google_maps_url,
    latitude: parseCoordinate(place.latitude),
    longitude: parseCoordinate(place.longitude),
    isInsideNatal: place.is_inside_natal ?? false,
    isDayTrip: place.is_day_trip ?? false,
    coverImageUrl: coverImage?.image_url ?? null,
    imageCredit: coverImage?.credit_text ?? null,
    imageLicense: coverImage?.license ?? null,
    imageSourceUrl: coverImage?.source_url ?? null,
    vibes: (place.place_vibes ?? [])
      .map((placeVibe) => {
        const vibe = Array.isArray(placeVibe.vibes) ? placeVibe.vibes[0] : placeVibe.vibes;

        if (!vibe) {
          return null;
        }

        return {
          id: vibe.id,
          label: vibe.label,
          emoji: vibe.emoji,
          sortOrder: vibe.sort_order,
          weight: placeVibe.weight ?? 0,
        };
      })
      .filter((vibe): vibe is NonNullable<typeof vibe> => vibe !== null)
      .sort(compareVibes)
      .map(({ id, label, emoji, weight }) => ({
        id,
        label,
        emoji,
        weight,
      })),
  };
}

function compareBySortOrder(left: PlaceImageRow, right: PlaceImageRow) {
  return (
    (left.sort_order ?? Number.MAX_SAFE_INTEGER) - (right.sort_order ?? Number.MAX_SAFE_INTEGER)
  );
}

function compareVibes(
  left: { sortOrder: number | null; label: string; weight: number },
  right: { sortOrder: number | null; label: string; weight: number },
) {
  const sortOrderDiff =
    (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER);

  if (sortOrderDiff !== 0) {
    return sortOrderDiff;
  }

  if (left.weight !== right.weight) {
    return right.weight - left.weight;
  }

  return left.label.localeCompare(right.label);
}

function parseCoordinate(value: number | string | null) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function isRelationshipError(error: SupabaseLikeError) {
  const message = [error.message, error.details, error.hint].filter(Boolean).join(" ");

  return (
    error.code === "PGRST200" ||
    message.includes("relationship") ||
    message.includes("schema cache")
  );
}
