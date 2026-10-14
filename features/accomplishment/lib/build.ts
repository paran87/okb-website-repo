/**
 * Builds the accomplishment dashboard (Region > Site > Waterway) from the OKB SSOT sheet tabs.
 * Port of rdBuild_ in the "OKB SSOT" Apps Script project (Accomplishment.gs): the same tabs, the same column
 * names, the same name matching and the same progress scale detection.
 */
import { dayOrder, isoDay, parseSheetDate } from "@/features/accomplishment/lib/dates";
import type {
  AccomplishmentData,
  AccomplishmentRecord,
  AccomplishmentRegion,
  AccomplishmentSite,
  SheetRows,
} from "@/features/accomplishment/types";

export interface Table {
  head: Map<string, number>;
  rows: string[][];
}

export function table(rows: SheetRows): Table {
  const [header = [], ...body] = rows;
  const head = new Map<string, number>();
  header.forEach((cell, column) => {
    const heading = String(cell ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (heading && !head.has(heading)) head.set(heading, column);
  });
  return { head, rows: body };
}

/** The first of [names] that is a heading of the tab, or -1. */
export function pick(head: Map<string, number>, names: string[]): number {
  for (const name of names) {
    const column = head.get(name);
    if (column !== undefined) return column;
  }
  return -1;
}

export const val = (row: string[], column: number) => (column < 0 ? "" : (row[column] ?? ""));

/** Comparable name: trimmed, upper case, single spaces, no zero-width or non-breaking spaces. */
export function key(value: unknown): string {
  return String(value ?? "")
    .replace(/[​-‍﻿]/g, "")
    .replace(/ /g, " ")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

/** Letters and digits only, for names written with different punctuation. */
export function looseKey(value: unknown): string {
  return key(value)
    .replace(/[‐-―]/g, "-")
    .replace(/[^A-Z0-9]+/g, "");
}

/** "68,700.00" → 68700, "10.80%" → 10.8, "" → null. */
export function num(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).trim().replace(/,/g, "").replace(/\s/g, "").replace(/%/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

const byName = <T extends { n: string }>(a: T, b: T) => (a.n < b.n ? -1 : a.n > b.n ? 1 : 0);

export interface AccomplishmentTabs {
  /** "Regions and Abbreviation": Region, Region Abbreviation. */
  regions: SheetRows;
  /** "SiteVsRegion": site, Region Abbreviation, Region. */
  siteRegion: SheetRows;
  /** "SitevsWaterway": site, name of waterway, Type, OFFICE. */
  siteWaterway: SheetRows;
  /** "WaterwayVsAccomplishment": name of waterway, planned_volume_office, accomplished_volume, progress, status, … */
  accomplishment: SheetRows;
  /** "Accomplishment Log": every field entry of a dredged volume (optional). */
  log?: SheetRows;
}

/** One waterway's Accomplishment Log, replayed (port of rdAccomplishmentLog_). */
export interface LogTotal {
  name: string;
  total: number;
  entries: number;
  lastAt: number | null;
  planned: number | null;
  cleaned: number | null;
  points: number | null;
}

/**
 * "update to" / "set" / "replace" sets the total; "update by" / "add" adds to it. Anything unrecognised counts
 * as an addition, the safe direction (same as the Apps Script).
 */
function entryMode(value: string): "to" | "by" {
  const word = value.toLowerCase().replace(/[^a-z]+/g, "");
  if (word === "to" || word.includes("updateto") || word.includes("set") || word.includes("replace") || word.includes("absolute")) return "to";
  return "by";
}

/** Replays the Accomplishment Log per waterway: entries in time order (row order when a row has no time). */
export function replayLog(rows: SheetRows | undefined): Map<string, LogTotal> & { rows?: number } {
  const out = new Map<string, LogTotal>() as Map<string, LogTotal> & { rows?: number };
  if (!rows?.length) return out;
  const t = table(rows);
  const name = pick(t.head, ["name of waterway", "waterway"]);
  if (name < 0) return out;
  const when = pick(t.head, ["timestamp", "date", "logged"]);
  const mode = pick(t.head, ["entry_mode", "entry mode", "mode"]);
  const volume = pick(t.head, ["volume_entered_cu_m", "volume entered cu m", "volume_entered", "volume"]);
  const previous = pick(t.head, ["previous_total_cu_m", "previous total cu m", "previous_total"]);
  const planned = pick(t.head, ["planned_volume_office", "planned volume office", "planned_volume"]);
  const cleaned = pick(t.head, ["points_cleaned", "points cleaned"]);
  const points = pick(t.head, ["points_total", "points total"]);
  const order = dayOrder(t.rows.map((r) => val(r, when)), "dmy");

  const groups = new Map<string, { name: string; entries: { index: number; at: number | null; row: string[] }[] }>();
  let counted = 0;
  t.rows.forEach((row, index) => {
    const raw = val(row, name);
    const k = key(raw);
    if (!k) return;
    let g = groups.get(k);
    if (!g) {
      g = { name: raw.trim(), entries: [] };
      groups.set(k, g);
    }
    g.entries.push({ index, at: parseSheetDate(val(row, when), order), row });
    counted++;
  });

  for (const [k, g] of groups) {
    const dated = g.entries.every((e) => e.at !== null);
    g.entries.sort((a, b) => (dated && a.at !== b.at ? (a.at ?? 0) - (b.at ?? 0) : a.index - b.index));
    const first = g.entries[0]!;
    const last = g.entries[g.entries.length - 1]!;
    let total = num(val(first.row, previous)) ?? 0;
    for (const e of g.entries) {
      const v = num(val(e.row, volume));
      if (v === null) continue;
      total = entryMode(val(e.row, mode)) === "to" ? v : total + v;
    }
    out.set(k, {
      name: g.name,
      total,
      entries: g.entries.length,
      lastAt: last.at,
      planned: num(val(last.row, planned)),
      cleaned: num(val(last.row, cleaned)),
      points: num(val(last.row, points)),
    });
  }
  out.rows = counted;
  return out;
}

export function buildAccomplishment(tabs: AccomplishmentTabs, generatedAt = new Date()): AccomplishmentData {
  // Region abbreviation → full region name.
  const regionTable = table(tabs.regions);
  const regionAbbr = pick(regionTable.head, ["region abbreviation", "region abbrev", "abbreviation"]);
  const regionName = pick(regionTable.head, ["region"]);
  const regionNames = new Map<string, string>();
  for (const row of regionTable.rows) {
    const abbr = key(val(row, regionAbbr));
    if (!abbr) continue;
    regionNames.set(abbr, val(row, regionName).trim() || abbr);
  }

  // Site → region.
  const siteTable = table(tabs.siteRegion);
  const siteColumn = pick(siteTable.head, ["site"]);
  const siteAbbr = pick(siteTable.head, ["region abbreviation", "region abbrev", "abbreviation"]);
  const siteRegionName = pick(siteTable.head, ["region"]);
  const siteRegions = new Map<string, { abbr: string; name: string }>();
  for (const row of siteTable.rows) {
    const site = key(val(row, siteColumn));
    if (!site) continue;
    const abbr = key(val(row, siteAbbr));
    const name = val(row, siteRegionName).trim() || regionNames.get(abbr) || abbr;
    siteRegions.set(site, { abbr: abbr || "", name: name || "UNASSIGNED" });
  }

  // Accomplishment per waterway, drainage or ISF record.
  type Acc = Pick<AccomplishmentRecord, "p" | "v" | "g" | "s" | "pl" | "al" | "lc" | "lu" | "pc" | "pt">;
  const accTable = table(tabs.accomplishment);
  const accName = pick(accTable.head, ["name of waterway", "waterway"]);
  const plannedVolume = pick(accTable.head, ["planned_volume_office", "planned volume office", "planned_volume"]);
  const accomplishedVolume = pick(accTable.head, ["accomplished_volume", "accomplished volume"]);
  const progressColumn = pick(accTable.head, ["progress"]);
  const statusColumn = pick(accTable.head, ["status"]);
  const plannedLength = pick(accTable.head, ["planned_length_office", "planned length office"]);
  const accomplishedLength = pick(accTable.head, ["accomplished_length", "accomplished length"]);

  const accomplishments = new Map<string, Acc>();
  const loose = new Map<string, Acc>();
  const duplicateLoose = new Set<string>();
  const progressValues: number[] = [];
  let sawPercentText = false;
  for (const row of accTable.rows) {
    const rawName = val(row, accName);
    const exact = key(rawName);
    if (!exact) continue;
    const rawProgress = val(row, progressColumn);
    if (rawProgress.includes("%")) sawPercentText = true;
    const progress = num(rawProgress);
    if (progress !== null && progress > 0) progressValues.push(progress);
    const record: Acc = {
      p: num(val(row, plannedVolume)),
      v: num(val(row, accomplishedVolume)),
      g: progress,
      s: val(row, statusColumn).trim(),
      pl: num(val(row, plannedLength)),
      al: num(val(row, accomplishedLength)),
    };
    accomplishments.set(exact, record);
    const lk = looseKey(rawName);
    if (lk) {
      const existing = loose.get(lk);
      if (existing && existing !== record) duplicateLoose.add(lk);
      else loose.set(lk, record);
    }
  }

  // Progress written as fractions (0.12) rather than percents (12%).
  let scale: AccomplishmentData["scale"] = "percent";
  if (!sawPercentText && progressValues.length) {
    progressValues.sort((a, b) => a - b);
    if ((progressValues[Math.floor(progressValues.length / 2)] ?? 0) <= 1.2) scale = "fraction";
  }
  // No progress given: accomplished / planned volume.
  for (const record of accomplishments.values()) {
    if (record.g === null && record.p !== null && record.p > 0 && record.v !== null) {
      const ratio = record.v / record.p;
      record.g = scale === "fraction" ? ratio : ratio * 100;
    }
  }

  // The log wins where there is one (rdBuild_): its replayed total becomes the accomplished volume, and the
  // percentage is recomputed from it when there is a planned volume to divide by.
  const log = replayLog(tabs.log);
  let logApplied = 0;
  let logOnly = 0;
  for (const [k, entry] of log) {
    let record: Acc | undefined = accomplishments.get(k);
    if (!record) {
      const lk = looseKey(entry.name);
      if (lk && !duplicateLoose.has(lk)) record = loose.get(lk);
    }
    if (!record) {
      record = { p: null, v: null, g: null, s: "", pl: null, al: null };
      accomplishments.set(k, record);
      const lk = looseKey(entry.name);
      if (lk && !loose.has(lk)) loose.set(lk, record);
      logOnly++;
    }
    record.v = entry.total;
    if (record.p === null && entry.planned !== null) record.p = entry.planned;
    if (record.p !== null && record.p > 0) {
      const ratio = entry.total / record.p;
      record.g = scale === "fraction" ? ratio : ratio * 100;
    }
    record.lc = entry.entries;
    record.lu = isoDay(entry.lastAt);
    record.pc = entry.cleaned;
    record.pt = entry.points;
    logApplied++;
  }

  // Records grouped by site, sites by region.
  const wwTable = table(tabs.siteWaterway);
  const wwSite = pick(wwTable.head, ["site"]);
  const wwName = pick(wwTable.head, ["name of waterway", "waterway"]);
  const wwType = pick(wwTable.head, ["type"]);
  const wwOffice = pick(wwTable.head, ["office"]);

  const regions = new Map<string, { a: string; n: string; sites: Map<string, AccomplishmentSite> }>();
  const seen = new Set<string>();
  let missing = 0;
  for (const row of wwTable.rows) {
    const siteRaw = val(row, wwSite).trim();
    const recordName = val(row, wwName).trim();
    if (!siteRaw || !recordName) continue;
    const type = val(row, wwType).trim();
    const lowerType = type.toLowerCase();
    const isISF = /\bisf\b/i.test(type) || lowerType.includes("informal settler");
    const isDrainage = lowerType.includes("drain");

    const siteKey = key(siteRaw);
    const recordKey = key(recordName);
    const dedupe = `${siteKey}||${recordKey}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    const region = siteRegions.get(siteKey) ?? { abbr: "", name: "UNASSIGNED" };
    const regionKey = region.abbr || region.name;
    let r = regions.get(regionKey);
    if (!r) {
      r = { a: region.abbr, n: region.name, sites: new Map() };
      regions.set(regionKey, r);
    }
    let site = r.sites.get(siteKey);
    if (!site) {
      site = { n: siteRaw, w: [] };
      r.sites.set(siteKey, site);
    }

    let acc = accomplishments.get(recordKey);
    if (!acc) {
      const lk = looseKey(recordName);
      if (lk && !duplicateLoose.has(lk)) acc = loose.get(lk);
    }
    if (!acc) {
      acc = { p: null, v: null, g: null, s: "", pl: null, al: null };
      missing++;
    }
    site.w.push({ n: recordName, t: type, o: val(row, wwOffice).trim(), ...acc, d: isDrainage, i: isISF });
  }

  const stats = { regions: 0, sites: 0, waterways: 0, drainages: 0, isf: 0, noAccomplishmentRow: missing };
  const output: AccomplishmentRegion[] = [...regions.values()]
    .map((r) => {
      const sites = [...r.sites.values()]
        .map((site) => {
          site.w.sort(byName);
          for (const w of site.w) {
            if (w.i) stats.isf++;
            else if (w.d) stats.drainages++;
            else stats.waterways++;
          }
          stats.sites++;
          return site;
        })
        .sort(byName);
      return { a: r.a, n: r.n, s: sites };
    })
    .sort(byName);
  stats.regions = output.length;

  return {
    generatedAt: generatedAt.toISOString(),
    scale,
    regions: output,
    stats,
    log: { present: Boolean(tabs.log), rows: log.rows ?? 0, waterways: log.size, applied: logApplied, logOnly },
  };
}
