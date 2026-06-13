import type { PublishedPlace } from "@/lib/supabase/places";
import type { RecommendationTier, TravelAnswers } from "./types";

export const QUIZ_TO_PLACE_VIBES: Record<string, string[]> = {
  praias: ["beaches"],
  fotos: ["photos"],
  "por-do-sol": ["sunset"],
  aventura: ["adventure"],
  descanso: ["relax"],
  cultura: ["history_culture"],
  artesanato: ["crafts"],
  gastronomia: ["gastronomy"],
  "bate-volta": ["day_trips"],
  barato: ["cheap"],
  natureza: ["nature"],
  romantico: ["romantic"],
};

const COMPANY_BOOST_VIBES: Record<string, string[]> = {
  couple: ["romantic", "sunset", "photos"],
  family: ["relax", "nature", "beaches", "history_culture"],
  friends: ["adventure", "day_trips", "photos", "gastronomy"],
  solo: ["history_culture", "relax", "photos"],
};

/**
 * Score mínimo para entrar nas seções de recomendação personalizada.
 * Calibrado contra o algoritmo real (vibes com weight 3–5 + ajustes de
 * orçamento/faixa/duração). Lugares abaixo viram "maybe"/"explore_only".
 */
export const MAIN_RECOMMENDATION_MIN_SCORE = 35;
export const SECONDARY_RECOMMENDATION_MIN_SCORE = 22;
export const MAYBE_MIN_SCORE = 10;

export type ScoreResult = {
  score: number;
  tier: RecommendationTier;
  reasons: string[];
  matchedVibes: string[];
};

export function resolveSelectedPlaceVibes(answers: TravelAnswers): Set<string> {
  return new Set((answers.vibes ?? []).flatMap((vibe) => QUIZ_TO_PLACE_VIBES[vibe] ?? []));
}

export function scorePlace(place: PublishedPlace, answers: TravelAnswers): ScoreResult {
  const reasons: string[] = [];
  let score = 0;

  const selectedPlaceVibes = resolveSelectedPlaceVibes(answers);
  const placeVibeIds = new Set(place.vibes.map((vibe) => vibe.id));

  // ── 1. Vibes escolhidas ────────────────────────────────────────────────
  // Principal sinal de personalização: peso alto (5) pontua bem mais que baixo (3).
  const matchedVibes: string[] = [];
  for (const vibe of place.vibes) {
    if (!selectedPlaceVibes.has(vibe.id)) continue;
    matchedVibes.push(vibe.id);
    score += 5 + Math.min(vibe.weight, 5) * 3;
  }
  if (matchedVibes.length > 0) {
    reasons.push(buildVibeReason(place, matchedVibes));
  }

  // ── 2. Orçamento ───────────────────────────────────────────────────────
  score += scoreBudget(place.priceLevel, answers.budget, reasons);

  // ── 3. Alcance da viagem ───────────────────────────────────────────────
  score += scoreRange(place, answers.range, reasons);

  // ── 4. Quantidade de dias ──────────────────────────────────────────────
  score += scoreDays(place, answers.days);

  // ── 5. Grupo da viagem ─────────────────────────────────────────────────
  const companyVibes = COMPANY_BOOST_VIBES[answers.company ?? ""] ?? [];
  let companyHits = 0;
  for (const vibe of companyVibes) {
    if (placeVibeIds.has(vibe)) {
      score += 2;
      companyHits += 1;
    }
  }
  const companyReason = buildCompanyReason(answers.company, companyHits);
  if (companyReason) reasons.push(companyReason);

  return {
    score,
    tier: pickTier(score, matchedVibes.length),
    reasons,
    matchedVibes,
  };
}

/**
 * Classifica o lugar em um tier a partir do score e do número de vibes que
 * casaram. Regra-chave: sem nenhuma vibe escolhida, o lugar NÃO pode ser
 * recomendação principal — fica no máximo em "maybe".
 */
function pickTier(score: number, matchCount: number): RecommendationTier {
  if (matchCount === 0) {
    return score >= MAYBE_MIN_SCORE ? "maybe" : "explore_only";
  }
  if (score >= MAIN_RECOMMENDATION_MIN_SCORE) return "strong_match";
  if (score >= SECONDARY_RECOMMENDATION_MIN_SCORE) return "good_match";
  if (score >= MAYBE_MIN_SCORE) return "maybe";
  return "explore_only";
}

function scoreBudget(priceLevel: string, budget: string | undefined, reasons: string[]): number {
  // price_level real no banco: free | cheap | medium. "expensive" fica previsto
  // para o futuro. Penalizações fortes para orçamento econômico × caro.
  const table: Record<string, Record<string, number>> = {
    econ: { free: 6, cheap: 6, medium: -6, expensive: -12 },
    balanced: { free: 3, cheap: 3, medium: 6, expensive: -3 },
    comfort: { free: 2, cheap: 2, medium: 6, expensive: 6 },
  };

  if (!budget || !table[budget]) return 0;
  const points = table[budget][priceLevel] ?? 0;

  if (budget === "econ" && (priceLevel === "free" || priceLevel === "cheap")) {
    reasons.push(
      priceLevel === "free"
        ? "Boa escolha para curtir Natal sem gastar nada."
        : "Boa escolha para curtir Natal sem gastar muito.",
    );
  }

  return points;
}

function scoreRange(place: PublishedPlace, range: string | undefined, reasons: string[]): number {
  if (range === "natal") {
    // "Só Natal": derruba forte quem é bate-volta / fora de Natal, sem zerar.
    if (place.isInsideNatal) {
      reasons.push("Entra bem no seu roteiro porque fica dentro de Natal.");
      return 6;
    }
    if (place.isDayTrip) return -18;
    return -8;
  }

  if (range === "around") {
    if (place.isDayTrip) {
      reasons.push("Vale como bate-volta pertinho de Natal.");
      return 4;
    }
    if (place.isInsideNatal) return 3;
    return 0;
  }

  // "best" ou indefinido: não penaliza distância.
  return 0;
}

function scoreDays(place: PublishedPlace, days: string | undefined): number {
  switch (days) {
    case "1":
      // Pouco tempo: prioriza Natal e penaliza forte bate-voltas longos.
      if (place.isInsideNatal) return 4;
      if (place.isDayTrip) return -16;
      return 0;
    case "2-3":
      if (place.isDayTrip) return 1;
      return 0;
    case "4-5":
      if (place.isDayTrip) return 3;
      return 1;
    case "5+":
      if (place.isDayTrip) return 4;
      return 1;
    default:
      return 0;
  }
}

function buildVibeReason(place: PublishedPlace, matchedVibeIds: string[]): string {
  const labels = place.vibes
    .filter((vibe) => matchedVibeIds.includes(vibe.id))
    .map((vibe) => vibe.label.toLowerCase());

  const list = formatList(labels);
  return list ? `Combina com sua busca por ${list}.` : "Combina com a vibe que você escolheu.";
}

function buildCompanyReason(company: string | undefined, hits: number): string | null {
  if (hits === 0) return null;
  switch (company) {
    case "couple":
      return "Boa opção para uma viagem a dois com visual bonito.";
    case "family":
      return "Tranquilo e bom para curtir em família.";
    case "friends":
      return "Rende boas histórias para curtir com os amigos.";
    case "solo":
      return "Fácil de aproveitar mesmo viajando sozinho(a).";
    default:
      return null;
  }
}

function formatList(items: string[]): string {
  const unique = [...new Set(items)];
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} e ${unique[1]}`;
  return `${unique.slice(0, -1).join(", ")} e ${unique[unique.length - 1]}`;
}
