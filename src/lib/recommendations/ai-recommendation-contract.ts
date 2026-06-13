import type { PublishedPlace } from "@/lib/supabase/places";
import { recommendPlaces } from "./recommend-places";
import type { TravelAnswers } from "./types";

/**
 * Contrato da futura camada de IA real.
 *
 * REGRAS INEGOCIÁVEIS para qualquer implementação (mock ou IA de verdade):
 * - A IA só pode retornar IDs que existam em `candidatePlaces`.
 * - A IA NÃO pode criar lugares novos.
 * - A IA NÃO pode inventar preço, horário, duração ou localização.
 * - Se a IA retornar um ID desconhecido, o sistema deve IGNORAR esse ID.
 *
 * A IA real deve rodar SOMENTE no servidor (TanStack Start server function /
 * API route), usando uma variável de ambiente SEM prefixo `VITE_`
 * (ex.: ANTHROPIC_API_KEY). Nunca expor a chave no browser.
 */
export type AICandidatePlace = {
  id: string;
  name: string;
  slug: string;
  category: string;
  region: string | null;
  shortDescription: string;
  priceLevel: string;
  approximatePrice: string | null;
  bestTime: string | null;
  averageDuration: string | null;
  isInsideNatal: boolean;
  isDayTrip: boolean;
  vibes: Array<{
    id: string;
    label: string;
    weight: number;
  }>;
};

export type AIRecommendationInput = {
  answers: TravelAnswers;
  candidatePlaces: AICandidatePlace[];
};

export type AIRecommendationOutput = {
  /** Apenas IDs presentes em `candidatePlaces`, na ordem recomendada. */
  orderedPlaceIds: string[];
  /** Razão personalizada por id de lugar. */
  reasoningByPlaceId: Record<string, string>;
  /** Mensagem opcional para a tela de transição. */
  transitionMessage?: string;
};

/** Monta o input da IA a partir dos lugares reais do Supabase. */
export function buildAIInput(
  places: PublishedPlace[],
  answers: TravelAnswers,
): AIRecommendationInput {
  return {
    answers,
    candidatePlaces: places.map((place) => ({
      id: place.id,
      name: place.name,
      slug: place.slug,
      category: place.category,
      region: place.region,
      shortDescription: place.shortDescription,
      priceLevel: place.priceLevel,
      approximatePrice: place.approximatePrice,
      bestTime: place.bestTime,
      averageDuration: place.averageDuration,
      isInsideNatal: place.isInsideNatal,
      isDayTrip: place.isDayTrip,
      vibes: place.vibes.map((vibe) => ({
        id: vibe.id,
        label: vibe.label,
        weight: vibe.weight,
      })),
    })),
  };
}

/**
 * Filtra a saída da IA contra os candidatos reais. Qualquer ID desconhecido é
 * descartado — é a barreira que impede a IA de inventar lugares. Use sempre que
 * for consumir uma `AIRecommendationOutput`, venha ela do mock ou da IA real.
 */
export function sanitizeAIOutput(
  output: AIRecommendationOutput,
  input: AIRecommendationInput,
): AIRecommendationOutput {
  const validIds = new Set(input.candidatePlaces.map((place) => place.id));
  const orderedPlaceIds = output.orderedPlaceIds.filter((id) => validIds.has(id));
  const reasoningByPlaceId: Record<string, string> = {};

  for (const [id, reason] of Object.entries(output.reasoningByPlaceId)) {
    if (validIds.has(id)) reasoningByPlaceId[id] = reason;
  }

  return {
    orderedPlaceIds,
    reasoningByPlaceId,
    transitionMessage: output.transitionMessage,
  };
}

/**
 * Mock da IA: reaproveita o algoritmo local determinístico para simular uma
 * resposta no formato do contrato. Permite trocar por Claude/OpenAI no servidor
 * depois, sem alterar quem consome a saída.
 */
export function mockAIRecommendPlaces(input: AIRecommendationInput): AIRecommendationOutput {
  // Reconstrói PublishedPlace o suficiente para o motor local. Os campos não
  // usados pelo score são preenchidos com defaults neutros.
  const placesById = new Map(input.candidatePlaces.map((place) => [place.id, place]));
  const places = input.candidatePlaces.map(toPublishedPlaceLike);

  const ranked = recommendPlaces(places, input.answers);
  const reasoningByPlaceId: Record<string, string> = {};

  for (const recommendation of ranked) {
    const reason = recommendation.reasons[0];
    if (reason) reasoningByPlaceId[recommendation.place.id] = reason;
  }

  const output: AIRecommendationOutput = {
    orderedPlaceIds: ranked.map((recommendation) => recommendation.place.id),
    reasoningByPlaceId,
    transitionMessage: "Selecionamos lugares que combinam com o seu jeito de viajar.",
  };

  return sanitizeAIOutput(output, {
    answers: input.answers,
    candidatePlaces: [...placesById.values()],
  });
}

function toPublishedPlaceLike(candidate: AICandidatePlace): PublishedPlace {
  return {
    id: candidate.id,
    name: candidate.name,
    slug: candidate.slug,
    category: candidate.category,
    region: candidate.region,
    locationLabel: null,
    shortDescription: candidate.shortDescription,
    longDescription: null,
    bestTime: candidate.bestTime,
    averageDuration: candidate.averageDuration,
    priceLevel: candidate.priceLevel,
    approximatePrice: candidate.approximatePrice,
    googleMapsUrl: null,
    latitude: null,
    longitude: null,
    isInsideNatal: candidate.isInsideNatal,
    isDayTrip: candidate.isDayTrip,
    coverImageUrl: null,
    imageCredit: null,
    imageLicense: null,
    imageSourceUrl: null,
    vibes: candidate.vibes.map((vibe) => ({
      id: vibe.id,
      label: vibe.label,
      emoji: null,
      weight: vibe.weight,
    })),
  };
}
