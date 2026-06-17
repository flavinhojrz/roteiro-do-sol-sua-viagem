import {
  clampPriceCents,
  isUuid,
  sanitizeContributionText,
  sanitizeDisplayName,
} from "@/lib/security/validation";
import { supabase } from "./client";
import { publicObjectUrl, uploadPublicObject } from "./storage";

const BUCKET = "contributions";
const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ContributionInput = {
  /** Lugar do catálogo (null quando é sugestão de lugar novo). */
  placeId: string | null;
  /** Nome do lugar sugerido (quando não é do catálogo). */
  suggestedPlace: string | null;
  opinion: string;
  suggestion: string;
  /** Preço em reais, como o usuário digitou (ex.: "25,50" ou 25.5). */
  priceReais: string | number | null;
  priceNote: string;
  rating: number | null;
  /** Nome a exibir; ignorado quando isAnonymous. */
  displayName: string | null;
  isAnonymous: boolean;
  photos: File[];
};

export type PublicContribution = {
  id: string;
  displayName: string | null;
  isAnonymous: boolean;
  opinion: string | null;
  suggestion: string | null;
  priceCents: number | null;
  priceNote: string | null;
  rating: number | null;
  photoUrls: string[];
  createdAt: string;
};

/** Erro amigável para a UI; detalhe técnico fica em `technical` (log em dev). */
export class ContributionError extends Error {
  technical: string;
  constructor(message: string, technical: string) {
    super(message);
    this.name = "ContributionError";
    this.technical = technical;
  }
}

function isMissingTableError(error: { code?: string; message?: string; details?: string } | null) {
  if (!error) return false;
  const haystack = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`;
  return (
    error.code === "PGRST205" ||
    haystack.includes("schema cache") ||
    haystack.includes("Could not find the table") ||
    haystack.includes("submit_contribution")
  );
}

function reaisToCents(value: string | number | null): number | null {
  if (value === null || value === "") return null;
  const normalized = typeof value === "string" ? value.replace(/\./g, "").replace(",", ".") : value;
  const reais = Number(normalized);
  if (!Number.isFinite(reais)) return null;
  return clampPriceCents(Math.round(reais * 100));
}

/**
 * Envia uma contribuição: sobe as fotos pro Storage e chama a RPC `submit_contribution`.
 * Entra como `pending` — só aparece no site após moderação.
 */
export async function submitContribution(input: ContributionInput): Promise<void> {
  const placeId = isUuid(input.placeId) ? input.placeId : null;
  const suggestedPlace = placeId ? null : sanitizeContributionText(input.suggestedPlace, 120);

  if (!placeId && !suggestedPlace) {
    throw new ContributionError("Escolha um lugar ou descreva sua sugestão.", "missing target");
  }

  const opinion = sanitizeContributionText(input.opinion, 1000);
  const suggestion = sanitizeContributionText(input.suggestion, 1000);
  const priceCents = reaisToCents(input.priceReais);
  const priceNote = sanitizeContributionText(input.priceNote, 120);
  const rating = input.rating && input.rating >= 1 && input.rating <= 5 ? input.rating : null;
  const displayName = input.isAnonymous ? null : sanitizeDisplayName(input.displayName);

  if (!opinion && !suggestion && priceCents === null) {
    throw new ContributionError(
      "Conte sua opinião, sugira um lugar ou informe um preço.",
      "empty content",
    );
  }

  const photos = input.photos.slice(0, MAX_PHOTOS);
  for (const file of photos) {
    if (!ALLOWED_TYPES[file.type]) {
      throw new ContributionError("Use fotos em JPG, PNG ou WEBP.", `bad type ${file.type}`);
    }
    if (file.size > MAX_PHOTO_BYTES) {
      throw new ContributionError("Cada foto deve ter no máximo 5 MB.", `too big ${file.size}`);
    }
  }

  // Sobe as fotos primeiro; só então registra a contribuição.
  const prefix = placeId ?? "novo";
  const photoPaths: string[] = [];
  for (const file of photos) {
    const path = `${prefix}/${crypto.randomUUID()}.${ALLOWED_TYPES[file.type]}`;
    try {
      await uploadPublicObject(BUCKET, path, file);
    } catch (error) {
      throw new ContributionError(
        "Não conseguimos enviar suas fotos agora. Tente novamente.",
        error instanceof Error ? error.message : String(error),
      );
    }
    photoPaths.push(path);
  }

  const { error } = await supabase.rpc("submit_contribution", {
    p_place_id: placeId,
    p_suggested_place: suggestedPlace,
    p_opinion: opinion,
    p_suggestion: suggestion,
    p_price_cents: priceCents,
    p_price_note: priceNote,
    p_rating: rating,
    p_display_name: displayName,
    p_is_anonymous: input.isAnonymous,
    p_photo_paths: photoPaths,
    p_consent: true,
  });

  if (error) {
    if (isMissingTableError(error)) {
      throw new ContributionError(
        "Este recurso ainda não está disponível. Tente mais tarde.",
        `[submit_contribution] aplique supabase/migrations/0006_contributions.sql. ${error.message ?? ""}`,
      );
    }
    throw new ContributionError(
      "Não conseguimos registrar sua contribuição agora. Tente novamente.",
      error.message ?? "rpc error",
    );
  }
}

type ContributionRow = {
  id: string;
  display_name: string | null;
  is_anonymous: boolean;
  opinion: string | null;
  suggestion: string | null;
  price_cents: number | null;
  price_note: string | null;
  rating: number | null;
  photo_paths: string[] | null;
  created_at: string;
};

/** Contribuições aprovadas de um lugar (RLS já filtra status='approved'). */
export async function getApprovedContributions(placeId: string): Promise<PublicContribution[]> {
  if (!isUuid(placeId)) return [];

  const { data, error } = await supabase
    .from("place_contributions")
    .select(
      "id, display_name, is_anonymous, opinion, suggestion, price_cents, price_note, rating, photo_paths, created_at",
    )
    .eq("place_id", placeId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error("getApprovedContributions:", error.message);
    return [];
  }

  return ((data ?? []) as ContributionRow[]).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    isAnonymous: row.is_anonymous,
    opinion: row.opinion,
    suggestion: row.suggestion,
    priceCents: row.price_cents,
    priceNote: row.price_note,
    rating: row.rating,
    photoUrls: (row.photo_paths ?? []).map((path) => publicObjectUrl(BUCKET, path)),
    createdAt: row.created_at,
  }));
}
