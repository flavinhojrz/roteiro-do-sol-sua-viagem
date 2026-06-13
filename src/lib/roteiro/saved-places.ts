import { useSyncExternalStore } from "react";
import { isUuid } from "@/lib/security/validation";

/**
 * Store local do "Meu Roteiro".
 *
 * Guarda apenas os IDs dos lugares escolhidos pelo usuário em localStorage —
 * persistência local, sem login. A camada real (Supabase/auth) pode substituir
 * isto depois sem mudar os componentes, que só dependem dos hooks abaixo.
 */
const STORAGE_KEY = "roteiro-do-sol:saved-places";
const EMPTY: string[] = [];

let cache: string[] = readFromStorage();
const listeners = new Set<() => void>();

function readFromStorage(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? [...new Set(parsed.filter(isUuid))].slice(0, 50) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function persist(next: string[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignora falhas de storage (modo privado/cota) — o estado vive na memória.
    }
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Mantém abas em sincronia quando o roteiro muda em outra aba.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cache = readFromStorage();
      listeners.forEach((l) => l());
    }
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  return cache;
}

export function addSavedPlace(id: string) {
  if (!isUuid(id) || cache.length >= 50) return;
  if (!cache.includes(id)) persist([...cache, id]);
}

export function removeSavedPlace(id: string) {
  if (cache.includes(id)) persist(cache.filter((savedId) => savedId !== id));
}

export function toggleSavedPlace(id: string) {
  if (cache.includes(id)) removeSavedPlace(id);
  else addSavedPlace(id);
}

/** Substitui todo o roteiro local (ex.: ao abrir um roteiro salvo para editar). */
export function setSavedPlaceIds(ids: string[]) {
  const unique = [...new Set(ids.filter(isUuid))].slice(0, 50);
  persist(unique);
}

/** Esvazia o roteiro local (ex.: ao criar um novo roteiro). */
export function clearSavedPlaces() {
  persist([]);
}

/** IDs salvos, reativo. No servidor retorna lista vazia. */
export function useSavedPlaceIds(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function useIsSaved(id: string): boolean {
  return useSavedPlaceIds().includes(id);
}
