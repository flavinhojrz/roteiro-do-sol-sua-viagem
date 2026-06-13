import type { PublishedPlace } from "@/lib/supabase/places";
import { scorePlace } from "./score-place";
import type { RecommendedPlace, TravelAnswers } from "./types";

/**
 * Ordena os lugares publicados de acordo com as respostas do onboarding.
 *
 * Nunca cria lugares: opera somente sobre `places` vindos do Supabase. Lugares
 * sem nenhuma resposta ainda recebem score (que pode ser 0) e são ordenados de
 * forma estável por nome para o resultado ser previsível.
 */
export function recommendPlaces(
  places: PublishedPlace[],
  answers: TravelAnswers,
): RecommendedPlace[] {
  return places
    .map((place) => {
      const { score, tier, reasons, matchedVibes } = scorePlace(place, answers);
      return { place, score, tier, reasons, matchedVibes };
    })
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.place.name.localeCompare(right.place.name);
    });
}
