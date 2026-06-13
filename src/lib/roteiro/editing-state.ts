import { useSyncExternalStore } from "react";
import { isPublicSlug, isUuid, sanitizeItineraryName } from "@/lib/security/validation";

/**
 * Qual roteiro salvo está sendo editado no momento.
 *
 * Quando o usuário abre um roteiro salvo para editar, guardamos aqui o id (e
 * nome/slug) do roteiro no Supabase. Assim, ao salvar, atualizamos o roteiro
 * existente em vez de criar um novo. Sem isso (null), salvar cria um novo.
 */
export type EditingItinerary = {
  id: string;
  name: string | null;
  publicSlug: string;
};

const STORAGE_KEY = "roteiro-do-sol:editing-itinerary";

let cache: EditingItinerary | null = readFromStorage();
const listeners = new Set<() => void>();

function readFromStorage(): EditingItinerary | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EditingItinerary>;
    if (!isUuid(parsed.id) || !isPublicSlug(parsed.publicSlug)) return null;
    return {
      id: parsed.id,
      publicSlug: parsed.publicSlug,
      name: sanitizeItineraryName(parsed.name),
    };
  } catch {
    return null;
  }
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function setEditingItinerary(value: EditingItinerary) {
  if (!isUuid(value.id) || !isPublicSlug(value.publicSlug)) return;
  cache = { ...value, name: sanitizeItineraryName(value.name) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // segue só em memória
  }
  emit();
}

export function clearEditingItinerary() {
  cache = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
  emit();
}

export function getEditingItinerary(): EditingItinerary | null {
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = readFromStorage();
      emit();
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useEditingItinerary(): EditingItinerary | null {
  return useSyncExternalStore(
    subscribe,
    () => cache,
    () => null,
  );
}
