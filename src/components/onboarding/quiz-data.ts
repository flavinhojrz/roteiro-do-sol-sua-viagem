export type QuizAnswers = {
  company?: string;
  days?: string;
  vibes: string[];
  budget?: string;
  range?: string;
};

export const COMPANY_OPTIONS = [
  { id: "solo", icon: "🧳", title: "Só eu", description: "Para explorar no seu ritmo." },
  {
    id: "couple",
    icon: "💑",
    title: "Casal",
    description: "Lugares leves, bonitos e com clima especial.",
  },
  {
    id: "family",
    icon: "👨‍👩‍👧",
    title: "Família",
    description: "Passeios tranquilos e bons para todo mundo.",
  },
  {
    id: "friends",
    icon: "🎉",
    title: "Amigos",
    description: "Experiências para curtir, explorar e registrar.",
  },
];

export const DAYS_OPTIONS = [
  { id: "1", icon: "☀️", title: "1 dia", description: "Para aproveitar o essencial." },
  { id: "2-3", icon: "🌤️", title: "2 a 3 dias", description: "Para curtir Natal com calma." },
  {
    id: "4-5",
    icon: "🏖️",
    title: "4 a 5 dias",
    description: "Para explorar mais lugares e experiências.",
  },
  { id: "5+", icon: "🌴", title: "Mais de 5 dias", description: "Para viver Natal sem pressa." },
];

export const VIBE_OPTIONS = [
  { id: "praias", icon: "🌊", title: "Praias" },
  { id: "fotos", icon: "📸", title: "Fotos bonitas" },
  { id: "por-do-sol", icon: "🌅", title: "Pôr do sol" },
  { id: "aventura", icon: "🏄", title: "Aventura" },
  { id: "descanso", icon: "🧘", title: "Descanso" },
  { id: "cultura", icon: "🏛️", title: "História e cultura" },
  { id: "artesanato", icon: "🛍️", title: "Artesanato" },
  { id: "gastronomia", icon: "🍽️", title: "Gastronomia" },
  { id: "bate-volta", icon: "🚗", title: "Bate-voltas" },
  { id: "barato", icon: "💸", title: "Passeios baratos" },
  { id: "natureza", icon: "🌿", title: "Natureza" },
  { id: "romantico", icon: "💑", title: "Rolê romântico" },
];

export const BUDGET_OPTIONS = [
  {
    id: "econ",
    icon: "💸",
    title: "Econômico",
    description: "Quero aproveitar gastando pouco, priorizando lugares gratuitos ou baratos.",
  },
  {
    id: "balanced",
    icon: "🌤️",
    title: "Equilibrado",
    description: "Quero misturar opções acessíveis com algumas experiências pagas.",
  },
  {
    id: "comfort",
    icon: "✨",
    title: "Confortável",
    description: "Quero aproveitar melhor, mesmo que algumas experiências custem um pouco mais.",
  },
];

export const RANGE_OPTIONS = [
  {
    id: "natal",
    icon: "🏖️",
    title: "Só Natal",
    description: "Quero focar nos lugares dentro da cidade.",
  },
  {
    id: "around",
    icon: "🚗",
    title: "Natal + arredores",
    description: "Topo conhecer lugares próximos, se fizer sentido.",
  },
  {
    id: "best",
    icon: "🧭",
    title: "Quero ver o que valer a pena",
    description: "Pode me mostrar as melhores opções, mesmo que sejam mais distantes.",
  },
];

export const MAX_VIBES = 5;

export function pickTransition(vibes: string[]) {
  const has = (ids: string[]) => ids.some((i) => vibes.includes(i));
  if (has(["cultura", "artesanato", "gastronomia"])) {
    return {
      key: "culture",
      title: "Encontrando experiências com a cara de Natal...",
      emojis: ["🏛️", "🛍️", "🍽️", "🎭"],
    };
  }
  if (has(["aventura", "bate-volta", "natureza"])) {
    return {
      key: "adventure",
      title: "Traçando caminhos para uma viagem com história pra contar...",
      emojis: ["🧭", "🗺️", "🏜️", "🚙"],
    };
  }
  if (has(["fotos", "por-do-sol"])) {
    return {
      key: "photos",
      title: "Buscando cenários que merecem entrar na sua galeria...",
      emojis: ["📸", "🌅", "✨", "🖼️"],
    };
  }
  return {
    key: "beach",
    title: "Separando cantinhos com sol, mar e aquela calma boa de Natal...",
    emojis: ["☀️", "🌊", "🌴", "🥥"],
  };
}
