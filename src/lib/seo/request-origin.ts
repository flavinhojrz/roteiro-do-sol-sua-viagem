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
      return getRequestUrl({ xForwardedHost: true }).origin;
    } catch {
      return "";
    }
  })
  .client(() => (typeof window !== "undefined" ? window.location.origin : ""));
