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
  type RecordType,
  type RollupMode,
  type WorkStatus,
} from "@/features/accomplishment/lib/rollup";
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
  top: { name: string; place: string; volume: number; pct: number | null }[];
  photos: { id: string; name: string; place: string; day: string | null }[];
  resources: { equipment: number; manpower: number };
  /** Accomplishment Log entries of these records in the 7 days before the sheet was read. */
  updates7d: number;
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

export function buildInfographic(source: PublicAccomplishment, filter: InfographicFilter, allPhotos: FieldPhoto[] = source.photos.latest): InfographicSummary {
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
  const group = (list: { label: string; sub: string; ways: AccomplishmentRecord[] }[]): InfographicRow[] =>
    list.map((g) => ({ label: g.label, sub: g.sub, pct: rollup(g.ways, prefs, scale), records: g.ways.length, done: doneOf(g.ways) }));
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
  const recordRows: InfographicRow[] = [...place.values()].map((p) => ({ label: p.record.n, sub: `${p.region} · ${p.site}`, pct: recordPct(p.record, scale), records: 1, done: doneOf([p.record]) }));
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
    .map((p) => ({ name: p.record.n, place: `${p.region} · ${p.site}`, volume: p.record.v ?? 0, pct: recordPct(p.record, scale) }));

  const photos: InfographicSummary["photos"] = [];
  const seenWays = new Set<string>();
  for (const p of allPhotos) {
    const at = place.get(p.w);
    if (!at || seenWays.has(p.w)) continue; // one photo per waterway, newest first
    seenWays.add(p.w);
    photos.push({ id: p.id, name: at.record.n, place: `${at.region} · ${at.site}`, day: p.d });
    if (photos.length === 3) break;
  }

  const regionCodes = new Set(tree.map((r) => regionLabel(r).code));
  const sitesInScope = new Set(tree.flatMap((r) => r.sites.map((s) => s.n.trim().toUpperCase())));
  const resourceSites = filter.regions.length ? data.resources.sites.filter((s) => regionCodes.has(s.region) || sitesInScope.has(s.site.trim().toUpperCase())) : null;
  const resources = resourceSites
    ? { equipment: resourceSites.reduce((n, s) => n + s.equipment, 0), manpower: resourceSites.reduce((n, s) => n + s.manpower, 0) }
    : { equipment: data.resources.equipment, manpower: data.resources.manpower };

  const read = Date.parse(data.generatedAt);
  const updates7d = data.updates.filter((u) => {
    const at = u.at ? Date.parse(u.at) : NaN;
    return place.has(u.waterway) && Number.isFinite(at) && read - at <= 7 * DAY && at <= read + DAY;
  }).length;

  const codes = tree.map((r) => regionLabel(r).code).filter((c) => c !== "Other");
  const regionsLabel = !filter.regions.length ? "All regions" : codes.length <= 3 ? codes.join(" · ") : `${codes.length} regions`;

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
    volume: volumeTotals(ways),
    length,
    points,
    status: statusCounts(ways, scale),
    rowsKind,
    rows: rowsAll.slice(0, MAX_ROWS),
    rowsMore: Math.max(0, rowsAll.length - MAX_ROWS),
    map,
    top,
    photos,
    resources,
    updates7d,
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
