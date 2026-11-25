/**
 * What the accomplishment infographic shows, worked out from the public dashboard data with the same filters and
 * roll-up rules as the page (record types, selected regions, average or by-volume progress). Pure: used by the
 * image route on the server.
 */
import {
  rollup,
  recordPct,
  regionLabel,
  regionToken,
  statusCounts,
  visibleTree,
  volumeTotals,
  workStatus,
  type RecordType,
  type RollupMode,
  type WorkStatus,
} from "@/features/accomplishment/lib/rollup";
import type { ArchiveChange, ArchiveTotals, ArchiveTotalsByKind } from "@/features/accomplishment/archive-types";
import type { FieldPhoto, PublicAccomplishment } from "@/features/accomplishment/public-types";
import type { AccomplishmentRecord } from "@/features/accomplishment/types";

export interface InfographicFilter {
  types: RecordType[];
  /** Region keys (as on the page); empty = every region. */
  regions: string[];
  mode: RollupMode;
}

export interface InfographicRow {
  label: string;
  sub: string;
  pct: number | null;
  records: number;
  done: number;
  /** Records by status (done is above). */
  ongoing: number;
  pending: number;
  none: number;
  /** Silt removed and planned (m³), length cleaned and planned (m). */
  volume: { acc: number; plan: number };
  length: { done: number; plan: number };
}

export interface InfographicSummary {
  scope: {
    types: RecordType[];
    typesLabel: string;
    regionsLabel: string;
    allRegions: boolean;
    mode: RollupMode;
    /** "waterways", "drainage lines", "records". */
    recordsWord: string;
  };
  /** When the sheet was read (ISO). */
  asOf: string;
  overall: number | null;
  records: number;
  sites: number;
  regions: number;
  volume: { acc: number; plan: number };
  length: { done: number; plan: number };
  points: { cleaned: number; total: number };
  status: Record<WorkStatus, number>;
  /** Regions, or for up to 3 regions their sites, cities or records; best progress first. */
  rowsKind: "region" | "site" | "city" | "record";
  rows: InfographicRow[];
  rowsMore: number;
  /** Every region with work listed for the selected types, for the map. */
  map: { token: string; code: string; pct: number | null; records: number; inScope: boolean }[];
  top: { name: string; place: string; volume: number; plan: number | null; pct: number | null; status: WorkStatus }[];
  photos: { id: string; name: string; place: string; day: string | null }[];
  /** Accomplishment Log entries of these records in the 7 days before the sheet was read. */
  updates7d: number;
  /** Each selected record type on its own (shown when more than one is selected). */
  byType: { type: RecordType; label: string; pct: number | null; records: number; done: number; volume: number }[];
  /** Field photos of these records, and how many records have one. */
  field: { photos: number; documented: number };
  /** Progress over time from the nightly History snapshots; null without them. */
  history: InfographicHistory | null;
}

/** The nightly snapshots (okb_accomplishment_snapshots) and the last 7 days of changes, as read on the server. */
export interface InfographicHistoryInput {
  snapshots: { day: string; totals: ArchiveTotalsByKind; regions: Record<string, ArchiveTotalsByKind> }[];
  changes: ArchiveChange[];
}

export interface InfographicHistory {
  /** First day of the series ("2026-11-03"). */
  since: string;
  /** Silt removed, records completed and length cleaned per day (the last point is today's live figures). */
  series: { day: string; acc: number; done: number; length: number }[];
  gain: { volume: number; done: number; length: number };
  week: {
    /** Records whose figures changed in the last 7 days. */
    updated: number;
    /** Silt removed in the last 7 days (net, m³). */
    volume: number;
    gains: { name: string; place: string; volume: number }[];
    completed: { name: string; place: string }[];
  };
}

export const MAX_ROWS = 18;
const TYPE_LABEL: Record<RecordType, string> = { waterway: "Waterways", drainage: "Drainage", isf: "ISF" };
const TYPE_WORD: Record<RecordType, string> = { waterway: "waterways", drainage: "drainage lines", isf: "ISF records" };

const DAY = 86_400_000;

/**
 * The data with every record's progress capped at 100%: a record that removed more than planned is done, and
 * some sheet rows report thousands of percent, which would turn averages into nonsense like "423% done".
 */
function capProgress(data: PublicAccomplishment): PublicAccomplishment {
  const max = data.scale === "fraction" ? 1 : 100;
  return {
    ...data,
    regions: data.regions.map((r) => ({ ...r, s: r.s.map((s) => ({ ...s, w: s.w.map((w) => (w.g !== null && w.g > max ? { ...w, g: max } : w)) })) })),
  };
}

/** Silt removed, records done and length cleaned in one snapshot, for the chosen types and region codes (null = all). */
function snapshotTotals(snap: InfographicHistoryInput["snapshots"][number], types: RecordType[], codes: Set<string> | null) {
  const out = { acc: 0, done: 0, length: 0, records: 0 };
  const add = (t: ArchiveTotals | undefined) => {
    if (!t) return;
    out.records += t.records;
    out.acc += t.accomplished;
    out.done += t.done;
    out.length += t.lengthDone;
  };
  for (const type of types) {
    if (!codes) add(snap.totals[type]);
    else for (const code of codes) add(snap.regions?.[code]?.[type]);
  }
  return out;
}

function buildHistory(
  input: InfographicHistoryInput,
  types: RecordType[],
  codes: Set<string> | null,
  today: string,
  live: { acc: number; done: number; length: number },
): InfographicHistory | null {
  // Nights with no records for the selection (a region not yet in the archive) are left out, or the line would
  // jump from nothing to the region's whole figures.
  const series = input.snapshots
    .filter((snap) => snap.day < today)
    .map((snap) => ({ day: snap.day, ...snapshotTotals(snap, types, codes) }))
    .filter((p) => p.records > 0)
    .map(({ day, acc, done, length }) => ({ day, acc, done, length }));
  series.push({ day: today, ...live });
  if (series.length < 3) return null;
  const first = series[0]!;
  const last = series[series.length - 1]!;

  // The last 7 days of changes to these records: net silt added per record, and records that became completed.
  const per = new Map<string, { name: string; place: string; first: number; last: number; completed: boolean }>();
  const typeSet = new Set(types);
  for (const c of [...input.changes].reverse()) {
    if (c.change !== "update" || !c.before || !c.after || !typeSet.has(c.kind) || (codes && !codes.has(c.region))) continue;
    const entry = per.get(c.key) ?? { name: c.name, place: `${c.region} · ${c.site}`, first: c.before.v ?? 0, last: 0, completed: false };
    entry.last = c.after.v ?? 0;
    if (c.before.st !== "done" && c.after.st === "done") entry.completed = true;
    if (c.before.st === "done" && c.after.st !== "done") entry.completed = false;
    per.set(c.key, entry);
  }
  const entries = [...per.values()];
  const gains = entries
    .map((e) => ({ name: e.name, place: e.place, volume: e.last - e.first }))
    .filter((g) => g.volume > 0.5)
    .sort((a, b) => b.volume - a.volume);
  return {
    since: first.day,
    series,
    gain: { volume: last.acc - first.acc, done: last.done - first.done, length: last.length - first.length },
    week: {
      updated: entries.length,
      volume: entries.reduce((n, e) => n + (e.last - e.first), 0),
      gains: gains.slice(0, 3),
      completed: entries.filter((e) => e.completed).slice(0, 3).map((e) => ({ name: e.name, place: e.place })),
    },
  };
}

export function buildInfographic(
  source: PublicAccomplishment,
  filter: InfographicFilter,
  { allPhotos = source.photos.latest, history = null }: { allPhotos?: FieldPhoto[]; history?: InfographicHistoryInput | null } = {},
): InfographicSummary {
  const data = capProgress(source);
  const types = (["waterway", "drainage", "isf"] as RecordType[]).filter((t) => filter.types.includes(t));
  const prefs = { mode: filter.mode, filter: "all" as const, types: types.length ? types : (["waterway"] as RecordType[]), regions: filter.regions };
  const tree = visibleTree(data, prefs, "").filter((r) => regionLabel(r).code !== "Other" || !filter.regions.length);
  const everyRegion = visibleTree(data, { ...prefs, regions: [] }, "");
  const ways = tree.flatMap((r) => r.ways);
  const scale = data.scale;

  // Records in scope, with their place, for photos, top lists and the log.
  const place = new Map<string, { record: AccomplishmentRecord; region: string; site: string }>();
  for (const r of tree) for (const s of r.sites) for (const w of s.w) if (!place.has(w.n)) place.set(w.n, { record: w, region: regionLabel(r).code, site: s.n });

  const length = ways.reduce((a, w) => ({ done: a.done + Math.max(0, w.al ?? 0), plan: a.plan + Math.max(0, w.pl ?? 0) }), { done: 0, plan: 0 });
  const points = ways.reduce((a, w) => ({ cleaned: a.cleaned + (w.x?.cp ?? w.pc ?? 0), total: a.total + (w.x?.tp ?? w.pt ?? 0) }), { cleaned: 0, total: 0 });
  const doneOf = (list: AccomplishmentRecord[]) => statusCounts(list, scale).done;

  // What the progress list shows: regions; for up to 3 regions their sites, else cities, else the records.
  const rowOf = (label: string, sub: string, list: AccomplishmentRecord[], pctValue: number | null): InfographicRow => {
    const st = statusCounts(list, scale);
    return {
      label,
      sub,
      pct: pctValue,
      records: list.length,
      done: st.done,
      ongoing: st.ongoing,
      pending: st.pending,
      none: st.none,
      volume: volumeTotals(list),
      length: list.reduce((a, w) => ({ done: a.done + Math.max(0, w.al ?? 0), plan: a.plan + Math.max(0, w.pl ?? 0) }), { done: 0, plan: 0 }),
    };
  };
  const group = (list: { label: string; sub: string; ways: AccomplishmentRecord[] }[]): InfographicRow[] =>
    list.map((g) => rowOf(g.label, g.sub, g.ways, rollup(g.ways, prefs, scale)));
  const regionRows = group(tree.filter((r) => regionLabel(r).code !== "Other").map((r) => ({ label: regionLabel(r).code, sub: regionLabel(r).name, ways: r.ways })));
  const siteRows = group(tree.flatMap((r) => r.sites.map((s) => ({ label: s.n, sub: regionLabel(r).code, ways: s.w }))));
  const cities = new Map<string, { label: string; sub: string; ways: AccomplishmentRecord[] }>();
  for (const p of place.values()) {
    const city = p.record.x?.city?.trim();
    if (!city) continue;
    const k = `${p.region}|${city.toUpperCase()}`;
    if (!cities.has(k)) cities.set(k, { label: city, sub: p.region, ways: [] });
    cities.get(k)!.ways.push(p.record);
  }
  const cityRows = group([...cities.values()]);
  const recordRows: InfographicRow[] = [...place.values()].map((p) => rowOf(p.record.n, `${p.region} · ${p.site}`, [p.record], recordPct(p.record, scale)));
  const [rowsKind, rowsAll]: [InfographicSummary["rowsKind"], InfographicRow[]] =
    regionRows.length >= 4 ? ["region", regionRows] : siteRows.length >= 4 ? ["site", siteRows] : cityRows.length >= 3 ? ["city", cityRows] : ["record", recordRows];
  rowsAll.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1) || b.records - a.records);

  const inScope = new Set(tree.map((r) => r.key));
  const map = everyRegion
    .filter((r) => regionLabel(r).code !== "Other")
    .map((r) => ({ token: regionToken(r), code: regionLabel(r).code, pct: r.pct, records: r.ways.length, inScope: inScope.has(r.key) }));

  const top = [...place.values()]
    .filter((p) => (p.record.v ?? 0) > 0)
    .sort((a, b) => (b.record.v ?? 0) - (a.record.v ?? 0))
    .slice(0, 5)
    .map((p) => ({
      name: p.record.n,
      place: `${p.region} · ${p.site}`,
      volume: p.record.v ?? 0,
      plan: (p.record.p ?? 0) > 0 ? p.record.p : null,
      pct: recordPct(p.record, scale),
      status: workStatus(p.record, scale),
    }));

  let photoCount = 0;
  const documented = new Set<string>();
  for (const p of allPhotos) {
    if (!place.has(p.w)) continue;
    photoCount++;
    documented.add(p.w);
  }

  const photos: InfographicSummary["photos"] = [];
  const seenWays = new Set<string>();
  for (const p of allPhotos) {
    const at = place.get(p.w);
    if (!at || seenWays.has(p.w)) continue; // one photo per waterway, newest first
    seenWays.add(p.w);
    photos.push({ id: p.id, name: at.record.n, place: `${at.region} · ${at.site}`, day: p.d });
    if (photos.length === 6) break;
  }

  const read = Date.parse(data.generatedAt);
  const updates7d = data.updates.filter((u) => {
    const at = u.at ? Date.parse(u.at) : NaN;
    return place.has(u.waterway) && Number.isFinite(at) && read - at <= 7 * DAY && at <= read + DAY;
  }).length;

  const codes = tree.map((r) => regionLabel(r).code).filter((c) => c !== "Other");
  const regionsLabel = !filter.regions.length ? "All regions" : codes.length <= 3 ? codes.join(" · ") : `${codes.length} regions`;

  const byType = prefs.types.map((type) => {
    const list = ways.filter((w) => (w.i ? "isf" : w.d ? "drainage" : "waterway") === type);
    return { type, label: TYPE_LABEL[type], pct: rollup(list, prefs, scale), records: list.length, done: doneOf(list), volume: volumeTotals(list).acc };
  });

  const volume = volumeTotals(ways);
  const status = statusCounts(ways, scale);
  const today = new Date(read + 8 * 3600_000).toISOString().slice(0, 10);
  const historyOut = history
    ? buildHistory(history, prefs.types, filter.regions.length ? new Set(codes) : null, today, { acc: volume.acc, done: status.done, length: length.done })
    : null;

  return {
    scope: {
      types: prefs.types,
      typesLabel: prefs.types.map((t) => TYPE_LABEL[t]).join(" + "),
      regionsLabel,
      allRegions: !filter.regions.length,
      mode: filter.mode,
      recordsWord: prefs.types.length === 1 ? TYPE_WORD[prefs.types[0]!] : "records",
    },
    asOf: data.generatedAt,
    overall: rollup(ways, prefs, scale),
    records: ways.length,
    sites: tree.reduce((n, r) => n + r.sites.length, 0),
    regions: codes.length,
    volume,
    length,
    points,
    status,
    rowsKind,
    rows: rowsAll.slice(0, MAX_ROWS),
    rowsMore: Math.max(0, rowsAll.length - MAX_ROWS),
    map,
    top,
    photos,
    updates7d,
    byType,
    field: { photos: photoCount, documented: documented.size },
    history: historyOut,
  };
}

/** The record types and regions of a request (?types=waterway,drainage&regions=NCR,IV-A&mode=wtd). */
export function parseInfographicFilter(params: URLSearchParams): InfographicFilter {
  const types = (params.get("types") ?? "waterway")
    .split(",")
    .map((t) => t.trim())
    .filter((t): t is RecordType => t === "waterway" || t === "drainage" || t === "isf");
  const regions = (params.get("regions") ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r.length > 0 && r.length <= 80)
    .slice(0, 30);
  return { types: types.length ? [...new Set(types)] : ["waterway"], regions, mode: params.get("mode") === "wtd" ? "wtd" : "avg" };
}
