/**
 * The accomplishment archive's pure parts: each record's archived figures, the day's totals, and what changed
 * since the last snapshot. The Supabase side is features/accomplishment/server/archive.ts.
 */
import { recordPct, recordType, regionLabel, workStatus, type RecordType } from "@/features/accomplishment/lib/rollup";
import type { ArchivedState, ArchiveTotals, ArchiveTotalsByKind } from "@/features/accomplishment/archive-types";
import type { AccomplishmentData } from "@/features/accomplishment/types";

export interface ArchivedRecord {
  key: string;
  kind: RecordType;
  region: string;
  site: string;
  name: string;
  state: ArchivedState;
}

/** A record as stored (okb_accomplishment_records). */
export interface StoredRecord extends ArchivedRecord {
  firstSeen: string;
  lastChanged: string | null;
  removed: boolean;
}

export interface ArchiveDiff {
  changes: { key: string; kind: RecordType; region: string; site: string; name: string; change: "update" | "added" | "removed"; before: ArchivedState | null; after: ArchivedState | null }[];
  /** Rows to write to okb_accomplishment_records (new, changed, removed or back again). */
  upserts: StoredRecord[];
}

/** Manila calendar day of an instant. */
export const manilaDay = (at = new Date()) => new Date(at.getTime() + 8 * 3600_000).toISOString().slice(0, 10);

const norm = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const round = (n: number | null | undefined, digits = 2) => (n === null || n === undefined || !Number.isFinite(n) ? null : Math.round(n * 10 ** digits) / 10 ** digits);

/** Stable key of a record: type, region, site and name. */
export const recordKey = (kind: RecordType, region: string, site: string, name: string) => [kind, norm(region), norm(site), norm(name)].join("|");

/** Every record of the dashboard with its archived figures (the first of two records with the same key wins). */
export function archiveRecords(data: AccomplishmentData): ArchivedRecord[] {
  const out = new Map<string, ArchivedRecord>();
  for (const r of data.regions) {
    const region = regionLabel(r).code;
    for (const s of r.s)
      for (const w of s.w) {
        const kind = recordType(w);
        const key = recordKey(kind, region, s.n, w.n);
        if (out.has(key)) continue;
        out.set(key, {
          key,
          kind,
          region,
          site: s.n,
          name: w.n,
          state: {
            p: round(w.p),
            v: round(w.v),
            g: round(recordPct(w, data.scale)),
            st: workStatus(w, data.scale),
            pc: round(w.x?.cp ?? w.pc ?? null, 0),
            tp: round(w.x?.tp ?? w.pt ?? null, 0),
            al: round(w.al),
            pl: round(w.pl),
          },
        });
      }
  }
  return [...out.values()];
}

const emptyTotals = (): ArchiveTotals => ({
  records: 0,
  planned: 0,
  accomplished: 0,
  avg: null,
  done: 0,
  ongoing: 0,
  pending: 0,
  none: 0,
  pointsCleaned: 0,
  pointsTotal: 0,
  lengthDone: 0,
  lengthPlan: 0,
});

/** Totals per record type, overall and per region. */
export function summarize(records: ArchivedRecord[]): { totals: ArchiveTotalsByKind; regions: Record<string, ArchiveTotalsByKind> } {
  const totals: ArchiveTotalsByKind = {};
  const regions: Record<string, ArchiveTotalsByKind> = {};
  const sums = new Map<ArchiveTotals, number>();
  const add = (t: ArchiveTotals, s: ArchivedState) => {
    t.records++;
    t.planned += Math.max(0, s.p ?? 0);
    t.accomplished += Math.max(0, s.v ?? 0);
    t[s.st]++;
    t.pointsCleaned += s.pc ?? 0;
    t.pointsTotal += s.tp ?? 0;
    t.lengthDone += Math.max(0, s.al ?? 0);
    t.lengthPlan += Math.max(0, s.pl ?? 0);
    sums.set(t, (sums.get(t) ?? 0) + (s.g ?? 0));
  };
  for (const r of records) {
    add((totals[r.kind] ??= emptyTotals()), r.state);
    add(((regions[r.region] ??= {})[r.kind] ??= emptyTotals()), r.state);
  }
  for (const [t, sum] of sums) {
    t.avg = t.records ? round(sum / t.records) : null;
    t.planned = round(t.planned) ?? 0;
    t.accomplished = round(t.accomplished) ?? 0;
    t.lengthDone = round(t.lengthDone) ?? 0;
    t.lengthPlan = round(t.lengthPlan) ?? 0;
  }
  return { totals, regions };
}

const sameState = (a: ArchivedState, b: ArchivedState) =>
  a.p === b.p && a.v === b.v && a.g === b.g && a.st === b.st && a.pc === b.pc && a.tp === b.tp && a.al === b.al && a.pl === b.pl;

/**
 * What changed between the stored records and today's. On the first snapshot ([baseline]) every record is
 * stored without a change; afterwards new records are "added", changed figures "update", and records no
 * longer in the sheet "removed" (kept, and "update"d back when they return).
 */
export function diffRecords(stored: StoredRecord[], current: ArchivedRecord[], day: string, baseline: boolean): ArchiveDiff {
  const byKey = new Map(stored.map((s) => [s.key, s]));
  const changes: ArchiveDiff["changes"] = [];
  const upserts: StoredRecord[] = [];
  const seen = new Set<string>();
  for (const r of current) {
    seen.add(r.key);
    const old = byKey.get(r.key);
    if (!old) {
      if (!baseline) changes.push({ key: r.key, kind: r.kind, region: r.region, site: r.site, name: r.name, change: "added", before: null, after: r.state });
      upserts.push({ ...r, firstSeen: day, lastChanged: baseline ? null : day, removed: false });
      continue;
    }
    const changed = !sameState(old.state, r.state);
    const renamed = old.name !== r.name || old.site !== r.site || old.region !== r.region;
    if (changed || old.removed) {
      changes.push({ key: r.key, kind: r.kind, region: r.region, site: r.site, name: r.name, change: "update", before: old.state, after: r.state });
    }
    if (changed || old.removed || renamed) upserts.push({ ...r, firstSeen: old.firstSeen, lastChanged: changed || old.removed ? day : old.lastChanged, removed: false });
  }
  for (const old of stored) {
    if (seen.has(old.key) || old.removed) continue;
    changes.push({ key: old.key, kind: old.kind, region: old.region, site: old.site, name: old.name, change: "removed", before: old.state, after: null });
    upserts.push({ ...old, lastChanged: day, removed: true });
  }
  return { changes, upserts };
}
