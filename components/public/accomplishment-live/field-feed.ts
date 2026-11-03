import { recordType, type RecordType } from "@/features/accomplishment/lib/rollup";
import type { FieldUpdate } from "@/features/accomplishment/public-types";
import type { Selection } from "@/components/public/accomplishment-live/regions";

/** A drainage line's declogging accomplishment, dated by its newest field activity. */
export interface DrainageEntry extends Selection {
  /** Day of the newest field photo or Accomplishment Log entry ("2026-07-08"), null when none is dated. */
  at: string | null;
  via: "photo" | "log" | null;
}

/**
 * Drainage declogging is reported as each line's accomplished volume (WaterwayVsAccomplishment), not through the
 * Accomplishment Log, so the latest accomplishments are the drainage records that have a volume or a dated field
 * activity, newest activity first (undated ones last, largest volume first).
 */
export function drainageFeed(records: Selection[]): DrainageEntry[] {
  const out: DrainageEntry[] = [];
  for (const sel of records) {
    const w = sel.record;
    if (recordType(w) !== "drainage") continue;
    const photo = w.x?.pd ?? null;
    const log = w.lu ?? null;
    const at = photo && (!log || photo >= log) ? photo : log;
    if (!at && !((w.v ?? 0) > 0)) continue;
    out.push({ ...sel, at, via: at === null ? null : at === photo ? "photo" : "log" });
  }
  return out.sort((a, b) => (b.at ?? "").localeCompare(a.at ?? "") || (b.record.v ?? 0) - (a.record.v ?? 0) || a.record.n.localeCompare(b.record.n));
}

/** The record type of an Accomplishment Log entry: its record's type, else the type written in the log. */
export function logKind(u: FieldUpdate, find: (name: string) => Selection | null): RecordType {
  const sel = find(u.waterway);
  if (sel) return recordType(sel.record);
  if (/drain/i.test(u.type)) return "drainage";
  return /isf|informal/i.test(u.type) ? "isf" : "waterway";
}
