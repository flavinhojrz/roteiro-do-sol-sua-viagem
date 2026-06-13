import type { QuizAnswers } from "@/components/onboarding/quiz-data";
import type { TravelAnswers } from "./types";

const STORAGE_KEY = "roteiro-do-sol:travel-answers";
const VALID_COMPANY = new Set(["solo", "couple", "family", "friends"]);
const VALID_DAYS = new Set(["1", "2-3", "4-5", "5+"]);
const VALID_VIBES = new Set([
  "praias",
  "fotos",
  "por-do-sol",
  "aventura",
  "descanso",
  "cultura",
  "artesanato",
  "gastronomia",
  "bate-volta",
  "barato",
  "natureza",
  "romantico",
]);
const VALID_BUDGET = new Set(["econ", "balanced", "comfort"]);
const VALID_RANGE = new Set(["natal", "around", "best"]);

/** Converte as respostas do quiz no formato consumido pelo motor de recomendação. */
export function toTravelAnswers(answers: QuizAnswers): TravelAnswers {
  return sanitizeTravelAnswers({
    company: answers.company,
    days: answers.days,
    vibes: answers.vibes,
    budget: answers.budget,
    range: answers.range,
  });
}

/** Persiste as respostas para a página /roteiro recuperar depois do onboarding. */
export function saveTravelAnswers(answers: QuizAnswers): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toTravelAnswers(answers)));
  } catch {
    // Ignora falhas de storage (modo privado, cota etc.) — recomendação cai no default.
  }
}

/** Recupera as respostas salvas. Retorna objeto vazio se não houver nada. */
export function loadTravelAnswers(): TravelAnswers {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return sanitizeTravelAnswers(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function clearTravelAnswers(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // O restante da exclusao da conta nao deve depender do storage local.
  }
}

export function sanitizeTravelAnswers(value: unknown): TravelAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const answers: TravelAnswers = {};

  if (typeof input.company === "string" && VALID_COMPANY.has(input.company)) {
    answers.company = input.company;
  }
  if (typeof input.days === "string" && VALID_DAYS.has(input.days)) {
    answers.days = input.days;
  }
  if (Array.isArray(input.vibes)) {
    answers.vibes = [
      ...new Set(
        input.vibes.filter(
          (item): item is string => typeof item === "string" && VALID_VIBES.has(item),
        ),
      ),
    ].slice(0, 5);
  }
  if (typeof input.budget === "string" && VALID_BUDGET.has(input.budget)) {
    answers.budget = input.budget;
  }
  if (typeof input.range === "string" && VALID_RANGE.has(input.range)) {
    answers.range = input.range;
  }

  return answers;
}

export function hasTravelAnswers(answers: TravelAnswers): boolean {
  return Boolean(
    answers.company ||
    answers.days ||
    answers.budget ||
    answers.range ||
    (answers.vibes && answers.vibes.length > 0),
  );
}
