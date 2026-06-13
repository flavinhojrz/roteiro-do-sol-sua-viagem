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
