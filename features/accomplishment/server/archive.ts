import "server-only";
import { ApiError } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { SiteDbMissingError, siteDbConfigured, siteRest } from "@/features/admin/server/supabase";
import { archiveRecords, diffRecords, manilaDay, summarize, type StoredRecord } from "@/features/accomplishment/lib/archive";
import { getPublicAccomplishment } from "@/features/accomplishment/server/public-dashboard";
import type {
  AccomplishmentArchive,
  ArchiveChange,
  ArchivedState,
  ArchiveRun,
  ArchiveSnapshot,
  ArchiveTotalsByKind,
} from "@/features/accomplishment/archive-types";
import type { RecordType } from "@/features/accomplishment/lib/rollup";

/**
 * The accomplishment archive (supabase/migrations/20261103000000_okb_accomplishment_archive.sql): once a day
 * the OKB SSOT figures are compared with the last ones seen, every change is written to
 * okb_accomplishment_changes, and the day's totals to okb_accomplishment_snapshots.
 */

const log = logger.child({ module: "accomplishment-archive" });
const SNAPSHOTS = "okb_accomplishment_snapshots";
const RECORDS = "okb_accomplishment_records";
const CHANGES = "okb_accomplishment_changes";
/** PostgREST returns at most this many rows per request on a default Supabase project. */
const PAGE = 1000;
/** At most this many changes go to the browser for one period. */
const MAX_CHANGES = 3000;

interface RecordRow {
  key: string;
  kind: RecordType;
  region: string;
  site: string;
  name: string;
  state: ArchivedState;
  first_seen: string;
  last_changed: string | null;
  removed: boolean;
}

interface SnapshotRow {
  day: string;
  taken_at: string;
  baseline: boolean;
  records: number;
  totals: ArchiveTotalsByKind;
}

async function readAll<T>(path: string): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data } = await siteRest<T[]>(`${path}&limit=${PAGE}&offset=${offset}`);
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

async function writeChunks(table: string, rows: unknown[], prefer: string[]) {
  for (let i = 0; i < rows.length; i += 500) {
    await siteRest(table, { method: "POST", body: rows.slice(i, i + 500), prefer, timeoutMs: 30_000 });
  }
}

/** Compares today's sheet figures with the archive and saves the changes and the day's totals. */
export async function takeArchiveSnapshot(now = new Date()): Promise<ArchiveRun> {
  const day = manilaDay(now);
  const data = await getPublicAccomplishment();
  const current = archiveRecords(data);

  const rows = await readAll<RecordRow>(`${RECORDS}?select=key,kind,region,site,name,state,first_seen,last_changed,removed&order=key.asc`);
  const stored: StoredRecord[] = rows.map((r) => ({ ...r, firstSeen: r.first_seen, lastChanged: r.last_changed }));
  const live = stored.filter((s) => !s.removed).length;
  // A sheet that comes back mostly empty is a read problem, not hundreds of removed records.
  if (live > 20 && current.length < live / 2) {
    throw new ApiError(502, "INTERNAL_ERROR", `The OKB SSOT sheet returned ${current.length} records (the archive has ${live}); no snapshot was taken.`, {
      reason: "sheet_incomplete",
    });
  }

  const { data: today } = await siteRest<{ baseline: boolean }[]>(`${SNAPSHOTS}?select=baseline&day=eq.${day}`);
  const baseline = stored.length === 0 || Boolean(today?.[0]?.baseline);
  const diff = diffRecords(stored, current, day, stored.length === 0);
  const detectedAt = now.toISOString();

  if (diff.changes.length) {
    await writeChunks(
      CHANGES,
      diff.changes.map((c) => ({ ...c, day, detected_at: detectedAt })),
      ["return=minimal"],
    );
  }
  if (diff.upserts.length) {
    await writeChunks(
      `${RECORDS}?on_conflict=key`,
      diff.upserts.map((r) => ({
        key: r.key,
        kind: r.kind,
        region: r.region,
        site: r.site,
        name: r.name,
        state: r.state,
        first_seen: r.firstSeen,
        last_changed: r.lastChanged,
        removed: r.removed,
        updated_at: detectedAt,
      })),
      ["resolution=merge-duplicates", "return=minimal"],
    );
  }
  const { totals, regions } = summarize(current);
  await siteRest(`${SNAPSHOTS}?on_conflict=day`, {
    method: "POST",
    body: { day, taken_at: detectedAt, baseline, records: current.length, totals, regions },
    prefer: ["resolution=merge-duplicates", "return=minimal"],
  });

  const run = { day, baseline, records: current.length, changes: diff.changes.length };
  log.info(run, "Accomplishment snapshot taken");
  return run;
}

/** Days back for a period ("30"), or everything ("all"). */
export type ArchivePeriod = 7 | 30 | 90 | 365 | "all";

export function parsePeriod(raw: string | null): ArchivePeriod {
  if (raw === "all") return "all";
  const n = Number(raw);
  return n === 7 || n === 30 || n === 90 || n === 365 ? n : 30;
}

const notReady = (): AccomplishmentArchive => ({ ready: false, since: null, from: null, snapshots: [], changes: [], truncated: false });

/** Daily totals (every day) and the changes of the period, newest first. */
export async function getArchive(period: ArchivePeriod, now = new Date()): Promise<AccomplishmentArchive> {
  if (!siteDbConfigured()) return notReady();
  const from = period === "all" ? null : manilaDay(new Date(now.getTime() - (period - 1) * 86_400_000));
  try {
    const [snapshots, changes] = await Promise.all([
      readAll<SnapshotRow>(`${SNAPSHOTS}?select=day,taken_at,baseline,records,totals&order=day.asc`),
      siteRest<ArchiveChange[]>(
        `${CHANGES}?select=id,day,key,kind,region,site,name,change,before,after${from ? `&day=gte.${from}` : ""}&order=day.desc,id.desc&limit=${MAX_CHANGES + 1}`,
      ).then((r) => r.data ?? []),
    ]);
    const list: ArchiveSnapshot[] = snapshots.map((s) => ({ day: s.day, takenAt: s.taken_at, baseline: s.baseline, records: s.records, totals: s.totals ?? {} }));
    return {
      ready: true,
      since: list[0]?.day ?? null,
      from,
      snapshots: list,
      changes: changes.slice(0, MAX_CHANGES),
      truncated: changes.length > MAX_CHANGES,
    };
  } catch (error) {
    if (error instanceof SiteDbMissingError) return notReady();
    throw error;
  }
}

/** For Admin → Setup: are the tables there, and when was the last snapshot? */
export async function archiveStatus(): Promise<{ configured: boolean; ready: boolean; days: number; lastDay: string | null; lastTakenAt: string | null }> {
  if (!siteDbConfigured()) return { configured: false, ready: false, days: 0, lastDay: null, lastTakenAt: null };
  try {
    const { data, total } = await siteRest<{ day: string; taken_at: string }[]>(`${SNAPSHOTS}?select=day,taken_at&order=day.desc&limit=1`, { prefer: ["count=exact"] });
    return { configured: true, ready: true, days: total ?? data?.length ?? 0, lastDay: data?.[0]?.day ?? null, lastTakenAt: data?.[0]?.taken_at ?? null };
  } catch (error) {
    if (error instanceof SiteDbMissingError) return { configured: true, ready: false, days: 0, lastDay: null, lastTakenAt: null };
    throw error;
  }
}
