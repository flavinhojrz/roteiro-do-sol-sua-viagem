import { MAYBE_MIN_SCORE } from "./score-place";
import type { RecommendedPlace, TravelAnswers } from "./types";

/** Limite duro padrão quando a duração da viagem não foi informada. */
export const PERSONALIZED_RECOMMENDATION_LIMIT = 7;

/** Score mínimo para um lugar ser considerado recomendação personalizada. */
export const MIN_PERSONALIZED_SCORE = MAYBE_MIN_SCORE;

/**
 * Quantos lugares principais mostrar conforme o tempo de viagem.
 * Viagem curta = seleção mais enxuta; viagem longa = mais variedade.
 */
export function personalizedLimitForDays(days: string | undefined): number {
  switch (days) {
    case "1":
      return 4;
    case "2-3":
      return 6;
    case "4-5":
      return 8;
    case "5+":
      return 10;
    default:
      return PERSONALIZED_RECOMMENDATION_LIMIT;
  }
}

export type SplitRecommendations = {
  personalizedRecommendations: RecommendedPlace[];
  exploreMorePlaces: RecommendedPlace[];
  limit: number;
};

/**
 * Separa a curadoria personalizada do catálogo completo.
 *
 * Recebe a lista JÁ ordenada por score (saída de `recommendPlaces`). Remove
 * `explore_only` e lugares abaixo do score mínimo, aplica o limite duro por
 * duração da viagem e joga todo o restante (inclusive os elegíveis que não
 * couberam) em `exploreMorePlaces`. Nenhum lugar é apagado.
 */
export function splitRecommendations(
  recommendations: RecommendedPlace[],
  answers: TravelAnswers,
): SplitRecommendations {
  const limit = personalizedLimitForDays(answers.days);

  const eligible = recommendations.filter(
    (item) => item.tier !== "explore_only" && item.score >= MIN_PERSONALIZED_SCORE,
  );

  const personalizedRecommendations = eligible.slice(0, limit);
  const chosen = new Set(personalizedRecommendations.map((item) => item.place.id));
  const exploreMorePlaces = recommendations.filter((item) => !chosen.has(item.place.id));

  return { personalizedRecommendations, exploreMorePlaces, limit };
}
