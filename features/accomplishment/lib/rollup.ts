/**
 * Roll-up rules of the dredging and desilting progress page (the same rules as the OKB SSOT Apps Script dashboard):
 * which records count, how site, region and overall percentages are averaged, and each record's state.
 */
import type { AccomplishmentData, AccomplishmentRecord, AccomplishmentRegion } from "@/features/accomplishment/types";

export type RecordType = "waterway" | "drainage" | "isf";
/** Simple average (every record equal) or weighted by planned volume. */
export type RollupMode = "avg" | "wtd";
/** Every record, only records with a planned target, or without 0 target / 0 accomplishment. */
export type RecordFilter = "all" | "target" | "zero";

export interface Prefs {
  mode: RollupMode;
  filter: RecordFilter;
  types: RecordType[];
  /** Selected region keys; empty = all regions. */
  regions: string[];
}

export const DEFAULT_PREFS: Prefs = { mode: "avg", filter: "all", types: ["waterway"], regions: [] };

export const recordType = (w: AccomplishmentRecord): RecordType => (w.i ? "isf" : w.d ? "drainage" : "waterway");

/** Progress in percent (null when the record has none). */
export function recordPct(w: AccomplishmentRecord, scale: AccomplishmentData["scale"]): number | null {
  if (w.g === null) return null;
  return scale === "fraction" ? w.g * 100 : w.g;
}

const blankOrZero = (x: number | null) => x === null || x === 0;

export function counted(w: AccomplishmentRecord, prefs: Prefs): boolean {
  if (!prefs.types.includes(recordType(w))) return false;
  if (prefs.filter === "target") return (w.p ?? 0) > 0;
  if (prefs.filter === "zero") return !(blankOrZero(w.p) && blankOrZero(w.v));
  return true;
}

/** Percent accomplished of [ways]: a record without progress counts as 0. */
export function rollup(ways: AccomplishmentRecord[], prefs: Prefs, scale: AccomplishmentData["scale"]): number | null {
  if (!ways.length) return null;
  if (prefs.mode === "wtd") {
    let weight = 0;
    let sum = 0;
    for (const w of ways) {
      const p = w.p ?? 0;
      if (p > 0) {
        weight += p;
        sum += p * (recordPct(w, scale) ?? 0);
      }
    }
    return weight > 0 ? sum / weight : null;
  }
  return ways.reduce((s, w) => s + (recordPct(w, scale) ?? 0), 0) / ways.length;
}

/** Region order north to south. */
const REGION_ORDER: Record<string, number> = {
  CAR: 0, NCR: 1, I: 2, II: 3, III: 4, "IV-A": 5, MIMAROPA: 6, "IV-B": 6, V: 7,
  VI: 8, NIR: 9, VII: 10, VIII: 11, IX: 12, X: 13, XI: 14, XII: 15, XIII: 16, BARMM: 17,
};

export function regionToken(r: Pick<AccomplishmentRegion, "a" | "n">): string {
  const raw = (r.a || r.n || "").toUpperCase().trim();
  for (const w of ["MIMAROPA", "BARMM", "NIR", "NCR", "CAR"]) if (new RegExp(`\\b${w}\\b`).test(raw)) return w;
  const bare = raw.replace(/^REGION\s+/, "").trim();
  return bare.match(/^(IV-A|IV-B|XIII|XII|XI|VIII|VII|VI|IX|IV|III|II|I|V|X)(?:\b|\s|$)/)?.[1] ?? bare;
}

export const regionKey = (r: Pick<AccomplishmentRegion, "a" | "n">) => r.a || r.n;

export function sortRegions<T extends Pick<AccomplishmentRegion, "a" | "n">>(regions: T[]): T[] {
  const rank = (r: T) => REGION_ORDER[regionToken(r)] ?? 999;
  return regions.map((r, i) => ({ r, i })).sort((x, y) => rank(x.r) - rank(y.r) || x.i - y.i).map((x) => x.r);
}

/** "Completed …", "Ongoing …", "Not Yet Started …", else the status as written. */
export function statusBadge(status: string): { tone: "done" | "ongoing" | "pending"; label: string; rest: string } | null {
  const s = status.trim();
  const rules: [RegExp, "done" | "ongoing" | "pending", string][] = [
    [/^(completed|complete|done|finished)\b(.*)$/i, "done", "Completed"],
    [/^(on[-\s]?going|in[-\s]progress|started)\b(.*)$/i, "ongoing", "Ongoing"],
    [/^(not[-\s]yet[-\s]started|not[-\s]started|not[-\s]yet[-\s]begun|unstarted|pending)\b(.*)$/i, "pending", "Not Yet Started"],
  ];
  for (const [re, tone, label] of rules) {
    const m = s.match(re);
    if (m) return { tone, label, rest: (m[2] ?? "").trim() };
  }
  return null;
}

export interface VisibleSite {
  n: string;
  w: AccomplishmentRecord[];
  pct: number | null;
}

export interface VisibleRegion {
  key: string;
  a: string;
  n: string;
  sites: VisibleSite[];
  ways: AccomplishmentRecord[];
  pct: number | null;
}

/** The regions, sites and records the current filters and search leave on screen, with their roll-ups. */
export function visibleTree(data: AccomplishmentData, prefs: Prefs, search: string): VisibleRegion[] {
  const q = search.trim().toLowerCase();
  const has = (s: string) => s.toLowerCase().includes(q);
  const out: VisibleRegion[] = [];
  for (const r of sortRegions(data.regions)) {
    if (prefs.regions.length && !prefs.regions.includes(regionKey(r))) continue;
    const regionHit = !q || has(r.n) || has(r.a);
    const sites: VisibleSite[] = [];
    const ways: AccomplishmentRecord[] = [];
    for (const s of r.s) {
      const siteHit = regionHit || has(s.n);
      const ws = s.w.filter((w) => counted(w, prefs) && (siteHit || has(w.n)));
      if (!ws.length) continue;
      ways.push(...ws);
      sites.push({ n: s.n, w: ws, pct: rollup(ws, prefs, data.scale) });
    }
    if (sites.length) out.push({ key: regionKey(r), a: r.a, n: r.n, sites, ways, pct: rollup(ways, prefs, data.scale) });
  }
  return out;
}

export function volumeTotals(ways: AccomplishmentRecord[]): { acc: number; plan: number } {
  let acc = 0;
  let plan = 0;
  for (const w of ways) {
    if ((w.p ?? 0) > 0) plan += w.p ?? 0;
    if ((w.v ?? 0) > 0) acc += w.v ?? 0;
  }
  return { acc, plan };
}

/** "1.2M", "345K", "12,345". */
export function compactVolume(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  return Math.round(n).toLocaleString("en-US");
}

/** CSV of the records on screen, with their region, site and percent. */
export function toCsv(tree: VisibleRegion[], scale: AccomplishmentData["scale"]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [["Region", "Site", "Name", "Type", "Office", "Planned volume (m³)", "Accomplished volume (m³)", "Progress (%)", "Status"]];
  for (const r of tree)
    for (const s of r.sites)
      for (const w of s.w) {
        const pct = recordPct(w, scale);
        lines.push([r.n, s.n, w.n, recordType(w), w.o, String(w.p ?? ""), String(w.v ?? ""), pct === null ? "" : pct.toFixed(1), w.s]);
      }
  return lines.map((l) => l.map(cell).join(",")).join("\n");
}

export type WorkStatus = "done" | "ongoing" | "pending" | "none";

export const WORK_STATUS: Record<WorkStatus, { label: string; color: string }> = {
  done: { label: "Completed", color: "var(--success)" },
  ongoing: { label: "Ongoing", color: "var(--info)" },
  pending: { label: "Not started", color: "var(--warning)" },
  none: { label: "No report", color: "var(--muted-foreground)" },
};

export const WORK_STATUS_ORDER: WorkStatus[] = ["done", "ongoing", "pending", "none"];

/** The record's state: from its status column, else from its numbers. */
export function workStatus(w: AccomplishmentRecord, scale: AccomplishmentData["scale"]): WorkStatus {
  const badge = statusBadge(w.s);
  if (badge) return badge.tone;
  const pct = recordPct(w, scale);
  if (pct !== null && pct >= 100) return "done";
  if ((w.v ?? 0) > 0) return "ongoing";
  if ((w.p ?? 0) > 0) return "pending";
  return "none";
}

export function statusCounts(ways: AccomplishmentRecord[], scale: AccomplishmentData["scale"]): Record<WorkStatus, number> {
  const c: Record<WorkStatus, number> = { done: 0, ongoing: 0, pending: 0, none: 0 };
  for (const w of ways) c[workStatus(w, scale)]++;
  return c;
}

/** "NCR" / "National Capital Region", "Region III" / "Central Luzon". */
export function regionLabel(r: Pick<AccomplishmentRegion, "a" | "n">): { code: string; name: string } {
  if (!r.a && /^unassigned$/i.test(r.n)) return { code: "Other", name: "Sites without a region" };
  const token = regionToken(r);
  const worded = ["CAR", "NCR", "NIR", "MIMAROPA", "BARMM"].includes(token);
  const code = worded ? token : `Region ${token}`;
  const name =
    r.n
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/^region\s+[ivx-]+[ab]?\s*[-–—:]\s*/i, "")
      .replace(/\s+region$/i, "")
      .trim() || code;
  return { code, name: name.toUpperCase() === code.toUpperCase() ? "" : name };
}
