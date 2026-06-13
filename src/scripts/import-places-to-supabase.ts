import { readFile } from "node:fs/promises";
import { createAdminSupabaseClient } from "./supabase-admin";

type PlaceStatus = "draft" | "review" | "published" | "archived";

type RawSource = {
  url: string;
  note?: string;
};

type RawImageCandidate = {
  url?: string;
  license?: string;
  credit?: string;
  note?: string;
};

type RawPlace = {
  name: string;
  slug: string;
  category: string;
  region?: string | null;
  location_label?: string | null;
  short_description: string;
  long_description?: string | null;
  best_time?: string | null;
  best_season?: string | null;
  average_duration?: string | null;
  price_level?: string | null;
  approximate_price?: string | null;
  google_maps_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_from_natal_km?: number | null;
  distance_from_airport_km?: number | null;
  distance_from_coast_km?: number | null;
  is_inside_natal?: boolean;
  is_day_trip?: boolean;
  tide_dependency?: boolean;
  activities?: string[];
  highlights?: string[];
  sub_beaches?: string[];
  logistic_notes?: string | null;
  wind_season?: string | null;
  status?: PlaceStatus;
  last_verified_at?: string | null;
  tags_vibes?: string[];
  mvp_relevance?: string | null;
  image_candidates?: RawImageCandidate[];
  image_note?: string | null;
  sources?: RawSource[];
};

const supabase = createAdminSupabaseClient();

function normalizeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getImportStatus(rawStatus: PlaceStatus | undefined): PlaceStatus {
  // Para o catálogo aparecer no frontend agora, usamos published.
  // Depois, se quiser, troque para: return rawStatus ?? "review";
  return "published";
}

function getSourceType(url: string) {
  try {
    const hostname = new URL(url).hostname;

    if (hostname.endsWith("gov.br")) {
      return "official";
    }

    if (hostname.includes("wikimedia.org")) {
      return "image";
    }

    return "reference";
  } catch {
    return "reference";
  }
}

function getSourceTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Fonte";
  }
}

function getVibeWeight(index: number) {
  if (index === 0) return 5;
  if (index <= 2) return 4;
  return 3;
}

function buildMetadata(place: RawPlace) {
  return {
    activities: place.activities ?? [],
    highlights: place.highlights ?? [],
    sub_beaches: place.sub_beaches ?? [],
    logistic_notes: place.logistic_notes ?? null,
    wind_season: place.wind_season ?? null,
    mvp_relevance: place.mvp_relevance ?? null,
    image_candidates: place.image_candidates ?? [],
    image_note: place.image_note ?? null,
    distance_from_coast_km: normalizeNumber(place.distance_from_coast_km),
  };
}

async function upsertPlace(place: RawPlace) {
  const payload = {
    name: place.name,
    slug: place.slug,
    category: place.category,
    region: place.region ?? null,
    location_label: place.location_label ?? null,
    short_description: place.short_description,
    long_description: place.long_description ?? null,
    best_time: place.best_time ?? null,
    best_season: place.best_season ?? null,
    average_duration: place.average_duration ?? null,
    price_level: place.price_level ?? "unknown",
    approximate_price: place.approximate_price ?? null,
    google_maps_url: place.google_maps_url ?? null,
    latitude: normalizeNumber(place.latitude),
    longitude: normalizeNumber(place.longitude),
    distance_from_natal_km: normalizeNumber(place.distance_from_natal_km),
    distance_from_airport_km: normalizeNumber(place.distance_from_airport_km),
    tide_dependency: Boolean(place.tide_dependency),
    is_inside_natal: Boolean(place.is_inside_natal),
    is_day_trip: Boolean(place.is_day_trip),
    status: getImportStatus(place.status),
    last_verified_at: place.last_verified_at
      ? new Date(place.last_verified_at).toISOString()
      : new Date().toISOString(),
    metadata: buildMetadata(place),
  };

  const { data, error } = await supabase
    .from("places")
    .upsert(payload, { onConflict: "slug" })
    .select("id, slug, name")
    .single();

  if (error) {
    throw new Error(`Erro ao inserir/atualizar place "${place.slug}": ${error.message}`);
  }

  return data;
}

async function upsertPlaceVibes(placeId: string, tags: string[] = []) {
  if (tags.length === 0) return;

  const rows = tags.map((vibeId, index) => ({
    place_id: placeId,
    vibe_id: vibeId,
    weight: getVibeWeight(index),
  }));

  const { error } = await supabase
    .from("place_vibes")
    .upsert(rows, { onConflict: "place_id,vibe_id" });

  if (error) {
    throw new Error(`Erro ao inserir vibes: ${error.message}`);
  }
}

async function insertMissingSources(placeId: string, sources: RawSource[] = []) {
  const validSources = sources.filter((source) => source.url?.trim());

  if (validSources.length === 0) return;

  const { data: existingSources, error: existingError } = await supabase
    .from("place_sources")
    .select("url")
    .eq("place_id", placeId);

  if (existingError) {
    throw new Error(`Erro ao buscar fontes existentes: ${existingError.message}`);
  }

  const existingUrls = new Set((existingSources ?? []).map((source) => source.url));

  const rows = validSources
    .filter((source) => !existingUrls.has(source.url))
    .map((source) => ({
      place_id: placeId,
      title: getSourceTitle(source.url),
      url: source.url,
      source_type: getSourceType(source.url),
      notes: source.note ?? null,
      last_checked_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return;

  const { error } = await supabase.from("place_sources").insert(rows);

  if (error) {
    throw new Error(`Erro ao inserir fontes: ${error.message}`);
  }
}

async function main() {
  const filePath = process.argv[2] ?? "data/places.json";
  const fileContent = await readFile(filePath, "utf-8");
  const places = JSON.parse(fileContent) as RawPlace[];

  if (!Array.isArray(places)) {
    throw new Error("O arquivo JSON precisa ser um array de lugares.");
  }

  console.log(`Importando ${places.length} lugares para o Supabase...`);

  for (const place of places) {
    console.log(`\n→ ${place.name}`);

    const savedPlace = await upsertPlace(place);

    await upsertPlaceVibes(savedPlace.id, place.tags_vibes);
    await insertMissingSources(savedPlace.id, place.sources);

    console.log(`✓ ${savedPlace.slug} importado/atualizado`);
  }

  console.log("\nImportação finalizada com sucesso.");
}

main().catch((error) => {
  console.error("\nFalha na importação:");
  console.error(error);
  process.exit(1);
});
