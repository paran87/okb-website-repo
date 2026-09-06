/**
 * Vercel often injects empty strings for dashboard variables that were
 * created but never filled in. Zod `.default()` only applies when the
 * value is `undefined`, so blank strings must be stripped first.
 */
export function omitBlankEnv(
  env: NodeJS.Dict<string>,
): Record<string, string | undefined> {
  const next: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    next[key] = typeof value === "string" && value.trim() === "" ? undefined : value;
  }
  return next;
}

export function omitBlankValue(value: string | undefined): string | undefined {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}
