/**
 * Thin localStorage wrapper — the only place this build touches browser
 * storage. SSR-safe (no-ops on the server); a future real backend swap
 * only needs to change this file's internals, not its callers.
 */
export type StoreKey =
  | "mb.users"
  | "mb.sellers"
  | "mb.listings"
  | "mb.reviews"
  | "mb.session";

export function readStore<T>(key: StoreKey, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: StoreKey, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota exceeded — mock data just won't persist.
  }
}

let idCounter = 0;

export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter}`;
}
