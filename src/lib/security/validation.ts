const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_SLUG_PATTERN = /^[a-z0-9]{10,64}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isPublicSlug(value: unknown): value is string {
  return typeof value === "string" && PUBLIC_SLUG_PATTERN.test(value);
}

export function sanitizeItineraryName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 80 || hasControlCharacters(normalized)) {
    return null;
  }
  return normalized;
}

/**
 * Texto livre de contribuição (opinião/sugestão). Permite quebras de linha e
 * tabs, remove demais caracteres de controle e aplica um teto de tamanho.
 * Retorna null quando vazio ou acima do limite.
 */
export function sanitizeContributionText(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      if (code === 9 || code === 10 || code === 13) return true; // \t \n \r
      return code > 31 && code !== 127;
    })
    .join("")
    .trim();
  if (!cleaned || cleaned.length > maxLen) return null;
  return cleaned;
}

/** Nome de exibição opcional (linha única). Retorna null quando inválido/vazio. */
export function sanitizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > 60 || hasControlCharacters(normalized)) {
    return null;
  }
  return normalized;
}

/** Converte um valor de preço em centavos inteiros (>= 0, teto sanitário) ou null. */
export function clampPriceCents(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  const cents = Math.round(numeric);
  if (cents > 100_000_000) return null;
  return cents;
}

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

export function safeHttpsUrl(value: unknown, allowedHosts?: readonly string[]): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;

    if (
      allowedHosts &&
      !allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
