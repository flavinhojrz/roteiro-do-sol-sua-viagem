import { isUuid } from "@/lib/security/validation";

const LEGACY_STORAGE_KEY = "roteiro-do-sol:visitor-id";

/**
 * Id aleatorio por roteiro, usado nas reacoes sem exigir conta. Nao reutilizar
 * um mesmo id entre roteiros evita correlacionar a navegacao do visitante.
 */
export function getVisitorId(itineraryId: string): string {
  if (typeof window === "undefined") return "";
  if (!isUuid(itineraryId)) return "";

  const storageKey = `roteiro-do-sol:visitor-id:${itineraryId}`;

  try {
    const existing = window.localStorage.getItem(storageKey);
    if (isUuid(existing)) return existing;

    const id = globalThis.crypto?.randomUUID?.();
    if (!id || !isUuid(id)) return "";

    window.localStorage.setItem(storageKey, id);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    return id;
  } catch {
    return "";
  }
}
