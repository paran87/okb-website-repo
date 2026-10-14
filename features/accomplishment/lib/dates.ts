/**
 * Dates as the OKB SSOT sheet writes them, read from its CSV export (the text shown in the cell).
 * Columns differ: the logs are day first ("14/10/2026 10:26:30"), the target dates month first
 * ("11/17/2025"), photo dates "2026.06.26", and some are spelled out ("May 31, 2026").
 */

export type DayOrder = "dmy" | "mdy";

const SLASHED = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]\.?m\.?)?)?/i;
const DOTTED = /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/;
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Which way round a column writes its slashed dates: a part above 12 settles it, else [fallback]. */
export function dayOrder(values: string[], fallback: DayOrder): DayOrder {
  for (const value of values) {
    const m = SLASHED.exec(value.trim());
    if (!m) continue;
    if (Number(m[1]) > 12) return "dmy";
    if (Number(m[2]) > 12) return "mdy";
  }
  return fallback;
}

/** A Manila wall-clock time as an instant. */
function manila(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): number | null {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const t = Date.UTC(y, mo - 1, d, h, mi, s) - MANILA_OFFSET_MS;
  return Number.isFinite(t) ? t : null;
}

/** Milliseconds since the epoch, or null when the cell cannot be read. Times are Philippine time. */
export function parseSheetDate(value: string, order: DayOrder = "mdy"): number | null {
  const text = value.replace(/[  ]/g, " ").trim();
  if (!text) return null;
  const slashed = SLASHED.exec(text);
  if (slashed) {
    const a = Number(slashed[1]);
    const b = Number(slashed[2]);
    let h = slashed[4] ? Number(slashed[4]) : 0;
    const ampm = slashed[7]?.toLowerCase().replace(/\./g, "");
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
    const [d, mo] = order === "dmy" ? [a, b] : [b, a];
    return manila(Number(slashed[3]), mo, d, h, Number(slashed[5] ?? 0), Number(slashed[6] ?? 0));
  }
  const dotted = DOTTED.exec(text);
  if (dotted) return manila(Number(dotted[1]), Number(dotted[2]), Number(dotted[3]));
  // "May 31, 2026", "Thursday, January 1, 2026 at 12:00 am": read the calendar date as Manila.
  const spelled = Date.parse(text.replace(/\s+at\s+.*$/i, ""));
  if (!Number.isFinite(spelled)) return null;
  const local = new Date(spelled);
  return manila(local.getFullYear(), local.getMonth() + 1, local.getDate());
}

/** "2026-10-14" (Manila calendar date) for an instant. */
export function isoDay(ms: number | null): string | null {
  if (ms === null) return null;
  return new Date(ms + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}
