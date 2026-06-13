import { supabase } from "./client";

/** Os quatro tipos de reação suportados, na ordem de exibição. */
export const REACTION_TYPES = ["love", "in", "lets_go", "photos"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

export const REACTION_META: Record<ReactionType, { emoji: string; label: string }> = {
  love: { emoji: "❤️", label: "Amei" },
  in: { emoji: "☀️", label: "Tô dentro" },
  lets_go: { emoji: "🌊", label: "Vamos nessa" },
  photos: { emoji: "📸", label: "Partiu fotos" },
};

export type ReactionCounts = Record<ReactionType, number>;

export function emptyCounts(): ReactionCounts {
  return { love: 0, in: 0, lets_go: 0, photos: 0 };
}

/** Lê os contadores agregados (via RPC SECURITY DEFINER, sem expor visitor_id). */
export async function getReactionCounts(itineraryId: string): Promise<ReactionCounts> {
  const { data, error } = await supabase.rpc("itinerary_reaction_counts", {
    p_itinerary: itineraryId,
  });
  if (error) throw new Error(error.message);

  const counts = emptyCounts();
  for (const row of (data ?? []) as Array<{ reaction: string; count: number }>) {
    if ((REACTION_TYPES as readonly string[]).includes(row.reaction)) {
      counts[row.reaction as ReactionType] = Number(row.count) || 0;
    }
  }
  return counts;
}

/**
 * Define (ou troca) a reação do visitante via função SECURITY DEFINER. A função
 * faz insert-on-conflict-do-update de forma atômica, então trocar de reação não
 * gera conflito de chave única. Não exige login.
 */
export async function setReaction(
  itineraryId: string,
  visitorId: string,
  reaction: ReactionType,
): Promise<void> {
  const { error } = await supabase.rpc("set_itinerary_reaction", {
    p_itinerary: itineraryId,
    p_visitor: visitorId,
    p_reaction: reaction,
  });
  if (error) throw new Error(error.message);
}

/** Remove a reação deste visitante neste roteiro (p_reaction nulo = remover). */
export async function clearReaction(itineraryId: string, visitorId: string): Promise<void> {
  const { error } = await supabase.rpc("set_itinerary_reaction", {
    p_itinerary: itineraryId,
    p_visitor: visitorId,
    p_reaction: null,
  });
  if (error) throw new Error(error.message);
}
