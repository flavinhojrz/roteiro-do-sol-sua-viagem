import type { TravelAnswers } from "@/lib/recommendations/types";
import { sanitizeTravelAnswers } from "@/lib/recommendations/answers-storage";
import { isPublicSlug, isUuid, sanitizeItineraryName } from "@/lib/security/validation";
import { supabase } from "./client";
import { mapPublishedPlace, placeWithRelationsColumns, type PublishedPlace } from "./places";

export type PublicItinerary = {
  id: string;
  name: string | null;
  publicSlug: string;
  createdAt: string;
  places: PublishedPlace[];
};

/** Roteiro inexistente ou privado (RLS bloqueia a leitura). */
export class ItineraryNotFoundError extends Error {
  constructor() {
    super("Roteiro não encontrado");
    this.name = "ItineraryNotFoundError";
  }
}

/** Tentativa de salvar roteiro sem lugares. Mensagem é segura para a UI. */
export class EmptyItineraryError extends Error {
  constructor() {
    super("Seu roteiro está vazio. Escolha alguns lugares antes de compartilhar.");
    this.name = "EmptyItineraryError";
  }
}

/** Usuário não autenticado ao salvar. Mensagem é segura para a UI. */
export class NotAuthenticatedError extends Error {
  constructor() {
    super("Você precisa entrar para salvar e compartilhar o roteiro.");
    this.name = "NotAuthenticatedError";
  }
}

/**
 * Falha inesperada ao salvar (banco, rede, schema). A `message` é amigável para
 * o usuário; o detalhe técnico fica em `technical` para log em desenvolvimento.
 */
export class ItinerarySaveError extends Error {
  technical: string;
  constructor(technical: string) {
    super("Não conseguimos salvar seu roteiro agora. Tente novamente em instantes.");
    this.name = "ItinerarySaveError";
    this.technical = technical;
  }
}

type SupabaseLikeError = { message?: string; code?: string; details?: string | null };

function isMissingTableError(error: SupabaseLikeError | null): boolean {
  if (!error) return false;
  const haystack = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`;
  return (
    error.code === "PGRST205" ||
    haystack.includes("schema cache") ||
    haystack.includes("Could not find the table")
  );
}

function toSaveError(error: SupabaseLikeError, context: string): ItinerarySaveError {
  if (isMissingTableError(error)) {
    return new ItinerarySaveError(
      `[${context}] Tabelas de roteiro ausentes no Supabase. Aplique supabase/migrations/0001_itineraries.sql ` +
        `no SQL Editor e rode "notify pgrst, 'reload schema';". Detalhe: ${error.message ?? ""}`,
    );
  }
  return new ItinerarySaveError(`[${context}] ${error.message ?? "erro desconhecido"}`);
}

export type ItineraryItemInput = {
  placeId: string;
  /** Seção simples opcional: "fits" (Cabe na sua viagem) | "if_time" (Se der tempo). */
  section?: string | null;
};

type CreateItineraryInput = {
  name: string | null;
  items: ItineraryItemInput[];
  answers?: TravelAnswers | null;
};

export type SavedItineraryRef = { id: string; publicSlug: string };
type SavedItineraryRpcRow = { id: string; public_slug: string };
type PublicItineraryRpcRow = {
  id: string;
  name: string | null;
  public_slug: string;
  created_at: string;
  place_ids: unknown;
};

/**
 * Cria um NOVO roteiro do usuário autenticado. Os itens apenas REFERENCIAM os
 * lugares (place_id) — nada dos dados do lugar é copiado.
 */
export async function createItinerary({
  name,
  items,
  answers,
}: CreateItineraryInput): Promise<SavedItineraryRef> {
  if (items.length === 0) {
    throw new EmptyItineraryError();
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new NotAuthenticatedError();
  }

  return saveItineraryRpc(null, name, items, answers);
}

/**
 * Atualiza um roteiro EXISTENTE do usuário (mesmo id e mesmo public_slug — o
 * link público continua válido). Substitui os itens pelos novos. Não duplica.
 */
export async function updateItinerary({
  id,
  name,
  items,
  answers,
}: CreateItineraryInput & { id: string }): Promise<SavedItineraryRef> {
  if (items.length === 0) {
    throw new EmptyItineraryError();
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new NotAuthenticatedError();
  }

  if (!isUuid(id)) {
    throw new ItinerarySaveError("[save_itinerary] id de roteiro inválido");
  }

  return saveItineraryRpc(id, name, items, answers);
}

async function saveItineraryRpc(
  id: string | null,
  name: string | null,
  items: ItineraryItemInput[],
  answers?: TravelAnswers | null,
): Promise<SavedItineraryRef> {
  const uniquePlaceIds = [...new Set(items.map((item) => item.placeId))];
  if (
    items.length > 50 ||
    uniquePlaceIds.length !== items.length ||
    uniquePlaceIds.some((placeId) => !isUuid(placeId))
  ) {
    throw new ItinerarySaveError("[save_itinerary] lista de lugares inválida");
  }

  const sections = items.map((item) =>
    item.section === "fits" || item.section === "if_time" ? item.section : null,
  );
  const safeAnswers = answers ? sanitizeTravelAnswers(answers) : null;

  const { data, error } = await supabase
    .rpc("save_itinerary", {
      p_id: id,
      p_name: sanitizeItineraryName(name),
      p_answers: safeAnswers,
      p_place_ids: uniquePlaceIds,
      p_sections: sections,
    })
    .single();

  if (error || !data) {
    throw toSaveError(error ?? { message: "RPC retornou vazio" }, "save_itinerary");
  }
  const row = data as SavedItineraryRpcRow;

  if (!isUuid(row.id) || !isPublicSlug(row.public_slug)) {
    throw new ItinerarySaveError("[save_itinerary] resposta inválida do servidor");
  }

  return { id: row.id, publicSlug: row.public_slug };
}

export async function deleteItinerary(id: string): Promise<void> {
  if (!isUuid(id)) throw new ItineraryNotFoundError();
  const { error } = await supabase.rpc("delete_itinerary", { p_itinerary: id });
  if (error) throw new Error("Não conseguimos excluir este roteiro agora.");
}

export type SavedItinerarySummary = {
  id: string;
  name: string | null;
  publicSlug: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  placeCount: number;
};

/** Lista os roteiros do usuário autenticado (RLS já restringe ao dono). */
export async function listMyItineraries(): Promise<SavedItinerarySummary[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new NotAuthenticatedError();

  const { data, error } = await supabase
    .from("itineraries")
    .select("id, name, public_slug, is_public, created_at, updated_at, itinerary_items(count)")
    .eq("user_id", userData.user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar seus roteiros: ${error.message}`);

  return (data ?? []).map((row) => {
    const itemsRel = row.itinerary_items as Array<{ count: number }> | null;
    return {
      id: row.id,
      name: row.name,
      publicSlug: row.public_slug,
      isPublic: row.is_public,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      placeCount: itemsRel?.[0]?.count ?? 0,
    };
  });
}

export type ItineraryForEdit = {
  id: string;
  name: string | null;
  publicSlug: string;
  isPublic: boolean;
  placeIds: string[];
};

/** Carrega um roteiro do usuário para edição (ids dos lugares, na ordem). */
export async function getItineraryForEdit(id: string): Promise<ItineraryForEdit> {
  if (!isUuid(id)) throw new ItineraryNotFoundError();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new NotAuthenticatedError();

  const { data: itinerary, error } = await supabase
    .from("itineraries")
    .select("id, name, public_slug, is_public")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) throw new Error(`Erro ao abrir o roteiro: ${error.message}`);
  if (!itinerary) throw new ItineraryNotFoundError();

  const { data: items, error: itemsError } = await supabase
    .from("itinerary_items")
    .select("place_id, sort_order")
    .eq("itinerary_id", id)
    .order("sort_order", { ascending: true });

  if (itemsError) throw new Error(`Erro ao abrir os lugares do roteiro: ${itemsError.message}`);

  return {
    id: itinerary.id,
    name: itinerary.name,
    publicSlug: itinerary.public_slug,
    isPublic: itinerary.is_public,
    placeIds: (items ?? []).map((item) => item.place_id as string),
  };
}

/** Lê um roteiro público pelo slug. Lança ItineraryNotFoundError se não existir/privado. */
export async function getPublicItinerary(slug: string): Promise<PublicItinerary> {
  if (!isPublicSlug(slug)) throw new ItineraryNotFoundError();

  const { data: itinerary, error } = await supabase
    .rpc("get_public_itinerary", { p_slug: slug })
    .maybeSingle();

  if (error) throw new Error(`Erro ao carregar o roteiro: ${error.message}`);
  if (!itinerary) throw new ItineraryNotFoundError();
  const row = itinerary as PublicItineraryRpcRow;
  if (
    !isUuid(row.id) ||
    !isPublicSlug(row.public_slug) ||
    typeof row.created_at !== "string" ||
    (row.name !== null && typeof row.name !== "string")
  ) {
    throw new Error("Resposta inválida ao carregar o roteiro.");
  }

  const placeIds: string[] = Array.isArray(row.place_ids)
    ? row.place_ids.filter(isUuid).slice(0, 50)
    : [];

  if (placeIds.length === 0) {
    return {
      id: row.id,
      name: row.name,
      publicSlug: row.public_slug,
      createdAt: row.created_at,
      places: [],
    };
  }

  const { data: placeRows, error: placesError } = await supabase
    .from("places")
    .select(placeWithRelationsColumns)
    .in("id", placeIds)
    .eq("status", "published");

  if (placesError) {
    throw new Error(`Erro ao carregar os lugares do roteiro: ${placesError.message}`);
  }

  const placesById = new Map(
    (placeRows ?? []).map((place) => {
      const mapped = mapPublishedPlace(place);
      return [mapped.id, mapped] as const;
    }),
  );
  const places = placeIds
    .map((placeId) => placesById.get(placeId) ?? null)
    .filter((place): place is PublishedPlace => place !== null);

  return {
    id: row.id,
    name: row.name,
    publicSlug: row.public_slug,
    createdAt: row.created_at,
    places,
  };
}
