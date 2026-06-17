import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

/**
 * Resolve a origem absoluta (protocolo + host) da requisição atual.
 *
 * No servidor (SSR) usa o host real que o crawler/usuário acessou — assim as
 * tags og:url/og:image saem absolutas já no HTML inicial. No cliente usa
 * window.location.origin. `createIsomorphicFn` mantém o import server-only fora
 * do bundle do navegador (o plugin de import-protection do TanStack exige isso).
 */
export const resolveRequestOrigin = createIsomorphicFn()
  .server(() => {
    try {
      const configuredOrigin = sanitizePublicOrigin(
        process.env.PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "",
      );
      if (configuredOrigin) return configuredOrigin;

      return sanitizePublicOrigin(getRequestUrl({ xForwardedHost: true }).origin) ?? "";
    } catch {
      return "";
    }
  })
  .client(() =>
    typeof window !== "undefined" ? (sanitizePublicOrigin(window.location.origin) ?? "") : "",
  );

function sanitizePublicOrigin(value: string): string | null {
  if (!value || value.length > 2048) return null;

  try {
    const url = new URL(value);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isHttpLocal = url.protocol === "http:" && isLocal;
    if (url.protocol !== "https:" && !isHttpLocal) return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    if (!isLocal && !/^[a-z0-9.-]+$/i.test(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}
