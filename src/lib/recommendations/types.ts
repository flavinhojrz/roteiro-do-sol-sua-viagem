import type { PublishedPlace } from "@/lib/supabase/places";

export type TravelAnswers = {
  company?: string;
  days?: string;
  vibes?: string[];
  budget?: string;
  range?: string;
};

/**
 * Nível de afinidade do lugar com o perfil do usuário.
 * - strong_match: combina com vibes + orçamento/faixa/duração (recomendação principal).
 * - good_match: combina com parte importante do perfil.
 * - maybe: pode fazer sentido, mas não é prioridade.
 * - explore_only: lugar válido, mas não é recomendação personalizada.
 */
export type RecommendationTier = "strong_match" | "good_match" | "maybe" | "explore_only";

export type RecommendedPlace = {
  place: PublishedPlace;
  score: number;
  tier: RecommendationTier;
  reasons: string[];
  matchedVibes: string[];
};

export type RecommendationSection = {
  id: string;
  title: string;
  description: string;
  items: RecommendedPlace[];
};
