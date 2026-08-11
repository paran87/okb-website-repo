/**
 * Type-safe, SSR-safe localStorage helpers. All access is guarded and wrapped in
 * try/catch so private-mode or quota errors never crash the app.
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore write errors (quota / private mode) */
    }
  },

  remove(key: string): void {
    if (!isBrowser()) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};
