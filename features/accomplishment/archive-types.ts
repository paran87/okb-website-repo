import type { RecordType, WorkStatus } from "@/features/accomplishment/lib/rollup";

/** A record's figures as archived (volumes in m³, lengths in m, progress in percent). */
export interface ArchivedState {
  /** Planned and accomplished volume. */
  p: number | null;
  v: number | null;
  /** Progress (percent). */
  g: number | null;
  /** Status. */
  st: WorkStatus;
  /** Traced points cleaned / total. */
  pc: number | null;
  tp: number | null;
  /** Accomplished / planned length. */
  al: number | null;
  pl: number | null;
}

/** Totals of one record type on one day. */
export interface ArchiveTotals {
  records: number;
  planned: number;
  accomplished: number;
  /** Average progress (percent, every record equal). */
  avg: number | null;
  done: number;
  ongoing: number;
  pending: number;
  none: number;
  pointsCleaned: number;
  pointsTotal: number;
  lengthDone: number;
  lengthPlan: number;
}

export type ArchiveTotalsByKind = Partial<Record<RecordType, ArchiveTotals>>;

export interface ArchiveSnapshot {
  /** Manila day, "2026-11-03". */
  day: string;
  takenAt: string;
  /** The first snapshot: the starting figures, with no changes recorded. */
  baseline: boolean;
  records: number;
  totals: ArchiveTotalsByKind;
}

export interface ArchiveChange {
  id: number;
  day: string;
  key: string;
  kind: RecordType;
  region: string;
  site: string;
  name: string;
  change: "update" | "added" | "removed";
  before: ArchivedState | null;
  after: ArchivedState | null;
}

/** The public archive: daily totals and the changes of a period, newest first. */
export interface AccomplishmentArchive {
  /** False until the archive tables exist and Supabase is connected. */
  ready: boolean;
  /** First archived day (null before the first snapshot). */
  since: string | null;
  /** Start of the period of [changes] ("2026-10-04"), null for everything. */
  from: string | null;
  snapshots: ArchiveSnapshot[];
  changes: ArchiveChange[];
  /** True when the period has more changes than were sent. */
  truncated: boolean;
}

/** Result of taking a snapshot. */
export interface ArchiveRun {
  day: string;
  baseline: boolean;
  records: number;
  changes: number;
}
