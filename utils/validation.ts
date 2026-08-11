/**
 * Lightweight, dependency-free validation predicates for use outside of Zod
 * schemas (e.g. quick guards in UI code). For request/DTO validation, prefer
 * Zod schemas in `lib/validation` or feature `schemas.ts`.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim().length === 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
