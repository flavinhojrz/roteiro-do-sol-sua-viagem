import type { RecommendationSection, RecommendationTier, RecommendedPlace } from "./types";

const TIER_RANK: Record<RecommendationTier, number> = {
  strong_match: 3,
  good_match: 2,
  maybe: 1,
  explore_only: 0,
};

type SectionConfig = {
  id: string;
  title: string;
  description: string;
  /** Tier mínimo aceito na seção. Seções posteriores aceitam tiers menores (spillover). */
  minRank: number;
  /** Máximo de lugares exibidos. `Infinity` = sem limite. */
  limit: number;
};

/**
 * Recebe APENAS a lista já limitada (`personalizedRecommendations`) e a quebra
 * em seções pequenas. O catálogo completo é tratado fora daqui
 * (`exploreMorePlaces`), então aqui não existe seção de "explorar tudo".
 * - "Mais a sua cara": só strong_match, no máx. 4.
 * - "Também vale considerar": good_match (+ spillover de strong), no máx. 4.
 * - "Se der tempo": o que sobrar da seleção (maybe), sem limite extra.
 */
const SECTION_CONFIG: SectionConfig[] = [
  {
    id: "strong",
    title: "Mais a sua cara",
    description: "A nossa curadoria para o perfil da sua viagem.",
    minRank: TIER_RANK.strong_match,
    limit: 4,
  },
  {
    id: "good",
    title: "Também vale considerar",
    description: "Boas opções que casam com parte do que você procura.",
    minRank: TIER_RANK.good_match,
    limit: 4,
  },
  {
    id: "maybe",
    title: "Se der tempo",
    description: "Encaixes extras que cabem no ritmo da sua viagem.",
    minRank: TIER_RANK.explore_only,
    limit: Number.POSITIVE_INFINITY,
  },
];

/**
 * Distribui as recomendações (já ordenadas por score) em seções por tier.
 *
 * Cada lugar entra em uma única seção — a primeira, na ordem da config, que
 * aceite seu tier e ainda tenha espaço. Como seções posteriores aceitam tiers
 * menores, o excedente de uma seção cheia "transborda" naturalmente para a
 * próxima, sem repetição e sem perder lugares.
 */
export function groupRecommendations(recommendations: RecommendedPlace[]): RecommendationSection[] {
  const sections = SECTION_CONFIG.map((config) => ({
    id: config.id,
    title: config.title,
    description: config.description,
    items: [] as RecommendedPlace[],
    config,
  }));

  for (const recommendation of recommendations) {
    const rank = TIER_RANK[recommendation.tier];
    const target = sections.find(
      (section) => rank >= section.config.minRank && section.items.length < section.config.limit,
    );
    target?.items.push(recommendation);
  }

  return sections
    .map(({ id, title, description, items }) => ({ id, title, description, items }))
    .filter((section) => section.items.length > 0);
}
