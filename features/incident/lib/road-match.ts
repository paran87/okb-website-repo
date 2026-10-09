/**
 * Puts a reported flood location on the DPWH road network (public/data/road-network/roads.geojson).
 *
 * Field reports name roads the way DPWH does ("Taft Ave", "España Blvd"), often as an intersection
 * ("Taft Ave cor. Pedro Gil St"). A location is drawn as:
 *  - the stretch around the intersection of two named roads (both roads within ~300 m of where they meet);
 *  - the stretch of a named road around the report's coordinates, when it has them;
 *  - the whole matching road sections otherwise (narrowed to the report's District Engineering Office);
 *  - a point when only coordinates are known.
 * Nothing is guessed beyond names: a location whose roads are not on the network is listed as "not on the map".
 */
import type { Feature, MultiLineString, Position } from "geojson";
import type { RoadFeature } from "@/features/road-network/types";

const ABBREVIATIONS: [RegExp, string][] = [
  [/\b(street|st)\b/g, "st"],
  [/\b(avenue|ave|av)\b/g, "ave"],
  [/\b(road|rd)\b/g, "rd"],
  [/\b(boulevard|blvd|bvd)\b/g, "blvd"],
  [/\b(highway|hwy|hiway)\b/g, "hwy"],
  [/\b(extension|ext)\b/g, "ext"],
  [/\b(drive)\b/g, "dr"],
  [/\b(general|gen)\b/g, "gen"],
  [/\b(santo)\b/g, "sto"],
  [/\b(santa)\b/g, "sta"],
  [/\b(president|pres)\b/g, "pres"],
  [/\b(senator|sen)\b/g, "sen"],
  [/\b(junction|jct)\b/g, "jct"],
];

/** Words that end a road name; "Taft" finds "Taft Ave" when that is the only such road. */
const SUFFIXES = new Set(["st", "ave", "rd", "blvd", "hwy", "ext", "dr"]);

/** Same road written differently. */
const ALIASES: Record<string, string> = {
  edsa: "epifanio de los santos ave",
  "c 5": "c 5 rd",
  c5: "c 5 rd",
  "c 4": "c 4 rd",
  "slex": "south luzon expressway",
  "nlex": "north luzon expressway",
};

/** Case, accent, punctuation and abbreviation insensitive road name. */
export function normalizeRoad(name: string | null | undefined): string {
  if (!name) return "";
  let t = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  for (const [re, rep] of ABBREVIATIONS) t = t.replace(re, rep);
  t = t.replace(/\s+/g, " ").trim();
  return ALIASES[t] ?? t;
}

const SPLIT = /\s+(?:cor\.?|corner|crnr|kanto|and|at|near|along|going\s+to|to)\s+|\s*[&/,;]\s*/i;

const CORNER = /^\s*(?:(?:limit\s*\/\s*)?landmark\s*:\s*)?(?:at\s+the\s+)?(?:corner(?:\s+of)?|cor\.?|crnr\.?|kanto(?:\s+ng)?|intersection(?:\s+of|\s+with)?|junction(?:\s+of|\s+with)?)\s+/i;
const LANDMARK_LABEL = /^\s*(?:limit\s*\/\s*)?landmark\s*:\s*/i;

/**
 * The cross street a landmark names: "corner Edsa to Ayala Malls" → "Edsa", "P. Margal St." → "P. Margal St.";
 * null for a landmark that is not a road ("in front of Goodyear").
 */
export function crossStreet(landmark: string | null | undefined): string | null {
  if (!landmark) return null;
  const corner = CORNER.test(landmark);
  const name = (landmark.replace(CORNER, "").replace(LANDMARK_LABEL, "").split(SPLIT)[0] ?? "").replace(/\([^)]*\)/g, " ").trim();
  const key = normalizeRoad(name);
  if (key.length < 3 || !/[a-z]/.test(key)) return null;
  const isRoad = corner || SUFFIXES.has(key.split(" ").at(-1) ?? "") || Object.values(ALIASES).includes(key);
  return isRoad ? name : null;
}

/**
 * Road names mentioned for a location: the extracted road name, the cross street its landmark names, and the
 * parts of the location text ("1. Taft Ave cor. Pedro Gil (in front of PGH) - knee deep" → ["Taft Ave", "Pedro Gil"]).
 */
export function roadCandidates(roadName: string | null, label: string | null, landmark: string | null = null): string[] {
  const parts: string[] = [];
  if (roadName) parts.push(roadName);
  const cross = crossStreet(landmark);
  if (cross) parts.push(cross);
  if (label) {
    const head = (label.replace(/^\s*\d{1,3}\s*[.)\-:]\s*/, "").split(/\s[-–—:]\s|\n/)[0] ?? "").replace(/\([^)]*\)/g, " ");
    parts.push(...head.split(SPLIT).map((p) => p.replace(LANDMARK_LABEL, "")));
  }
  const out: string[] = [];
  const keys = new Set<string>();
  for (const p of parts) {
    const name = p.replace(/\s+/g, " ").trim();
    const key = normalizeRoad(name);
    if (key.length < 3 || !/[a-z]/.test(key) || keys.has(key)) continue;
    keys.add(key);
    out.push(name);
  }
  return out.slice(0, 4);
}

/** "North Manila District Engineering Office" → "NMDEO"; "Metro Manila 1st …" → "MM1DEO". */
export function deoCode(name: string | null | undefined): string | null {
  if (!name) return null;
  const upper = name.toUpperCase().trim();
  const full = upper.match(/^(.*?)\s*DISTRICT\s+ENGINEERING\s+OFFICE/);
  if (!full) {
    const compact = upper.replace(/[^A-Z0-9]/g, "");
    if (!compact) return null;
    return compact.endsWith("DEO") ? compact : `${compact}DEO`;
  }
  const initials = (full[1] ?? "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => (/^\d+(ST|ND|RD|TH)?$/.test(w) ? w.replace(/\D/g, "") : w[0]))
    .join("");
  return initials ? `${initials}DEO` : null;
}

export interface RoadIndex {
  byName: Map<string, RoadFeature[]>;
}

/** Road sections by normalized name (a name in brackets is indexed too: "Sacristia St (Malabon Div Rd)"). */
export function buildRoadIndex(roads: RoadFeature[]): RoadIndex {
  const byName = new Map<string, RoadFeature[]>();
  const add = (key: string, road: RoadFeature) => {
    if (!key) return;
    const list = byName.get(key);
    if (list) list.push(road);
    else byName.set(key, [road]);
  };
  for (const road of roads) {
    const name = road.properties.name ?? "";
    add(normalizeRoad(name), road);
    const inner = name.match(/\(([^)]+)\)/);
    if (inner) {
      add(normalizeRoad(name.replace(/\([^)]*\)/g, " ")), road);
      add(normalizeRoad(inner[1]), road);
    }
  }
  return { byName };
}

/**
 * Road sections named [name], from the most to the least certain:
 *  1. the same name ("Taft Avenue" = "Taft Ave");
 *  2. without the road-type word ("Pedro Gil St" → "Pedro Gil (Herran)");
 *  3. with the one road-type word that carries it ("Pedro Gil" → "Pedro Gil St");
 *  4. with leading initials ("Lacson Ave" → "AH Lacson Ave").
 */
export function findRoads(index: RoadIndex, name: string): RoadFeature[] {
  const key = normalizeRoad(name);
  if (!key) return [];
  const exact = index.byName.get(key);
  if (exact) return exact;
  const tokens = key.split(" ");
  const hasSuffix = SUFFIXES.has(tokens.at(-1) ?? "");
  const core = hasSuffix ? tokens.slice(0, -1) : tokens;
  const coreKey = core.join(" ");
  if (!core.some((t) => t.length >= 4)) return [];

  if (hasSuffix) {
    const bare = index.byName.get(coreKey);
    if (bare) return bare;
  }
  if (!hasSuffix) {
    const withSuffix: RoadFeature[] = [];
    let types = 0;
    for (const suffix of SUFFIXES) {
      const hit = index.byName.get(`${coreKey} ${suffix}`);
      if (hit) {
        withSuffix.push(...hit);
        types++;
      }
    }
    // "Pedro Gil" is only certain when one road type carries that name.
    if (types === 1) return withSuffix;
    if (types > 1) return [];
  }

  const initials: RoadFeature[] = [];
  for (const [k, roads] of index.byName) {
    const kt = k.split(" ");
    if (!core.every((t) => kt.includes(t))) continue;
    const extra = kt.filter((t) => !core.includes(t) && !SUFFIXES.has(t));
    if (extra.length && extra.every((t) => t.length <= 2)) initials.push(...roads);
  }
  return initials;
}

// ---- geometry ---------------------------------------------------------------------------------------

const R = 6_371_000;
const lng = (p: Position) => p[0] ?? 0;
const lat = (p: Position) => p[1] ?? 0;

/** Distance in meters between two [lng, lat] positions (equirectangular; fine for city distances). */
export function meters(a: Position, b: Position): number {
  const midLat = ((lat(a) + lat(b)) / 2) * (Math.PI / 180);
  const dx = (lng(b) - lng(a)) * (Math.PI / 180) * Math.cos(midLat);
  const dy = (lat(b) - lat(a)) * (Math.PI / 180);
  return Math.sqrt(dx * dx + dy * dy) * R;
}

const midpoint = (p: Position, q: Position): Position => [(lng(p) + lng(q)) / 2, (lat(p) + lat(q)) / 2];

function lines(road: RoadFeature): Position[][] {
  const g = road.geometry;
  return g.type === "LineString" ? [g.coordinates] : g.coordinates;
}

/** Splits long segments so no two consecutive vertices are more than [step] meters apart. */
function densify(line: Position[], step = 40): Position[] {
  const out: Position[] = [];
  let q: Position | null = null;
  for (const p of line) {
    if (q) {
      const n = Math.floor(meters(q, p) / step);
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        out.push([lng(q) + (lng(p) - lng(q)) * t, lat(q) + (lat(p) - lat(q)) * t]);
      }
    }
    out.push(p);
    q = p;
  }
  return out;
}

/**
 * Where two sets of roads meet (vertices within [maxGap] meters), one point per crossing: two roads with
 * the same names can cross in more than one place (the same street name in two cities).
 */
export function meetingPoints(a: RoadFeature[], b: RoadFeature[], maxGap = 60): Position[] {
  const pairs: { d: number; p: Position }[] = [];
  const bLines = b.flatMap((r) => lines(r).map((l) => densify(l, 20)));
  for (const la of a.flatMap((r) => lines(r).map((l) => densify(l, 20)))) {
    for (const p of la) {
      for (const lb of bLines) {
        for (const q of lb) {
          const d = meters(p, q);
          if (d <= maxGap) pairs.push({ d, p: midpoint(p, q) });
        }
      }
    }
  }
  pairs.sort((x, y) => x.d - y.d);
  const crossings: Position[] = [];
  for (const { p } of pairs) {
    if (crossings.every((c) => meters(c, p) > 500)) crossings.push(p);
  }
  return crossings;
}

/** The parts of [roads] within [radius] meters of [center], as lines. */
export function clipAround(roads: RoadFeature[], center: Position, radius = 300): Position[][] {
  const out: Position[][] = [];
  for (const road of roads) {
    for (const line of lines(road)) {
      let run: Position[] = [];
      for (const p of densify(line)) {
        if (meters(p, center) <= radius) run.push(p);
        else {
          if (run.length > 1) out.push(run);
          run = [];
        }
      }
      if (run.length > 1) out.push(run);
    }
  }
  return out;
}

export interface ResolvedLocation {
  /** Lines to highlight. */
  lines: Position[][];
  /** Point to mark (coordinates from the report, or where two roads meet). */
  point: Position | null;
  /** Road names drawn. */
  matched: string[];
  /** How it was placed, for the list. */
  basis: "intersection" | "coordinates" | "road" | "point" | "none";
  /** Places it was drawn at (more than 1: two crossings of the same road names). */
  places: number;
}

export interface LocationToPlace {
  roads: string[];
  deo: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Narrows same-named road sections to the report's DEO, else to Metro Manila when they span regions. */
function narrow(roads: RoadFeature[], deo: string | null): RoadFeature[] {
  if (roads.length <= 1) return roads;
  const code = deoCode(deo);
  if (code) {
    const same = roads.filter((r) => deoCode(r.properties.deo) === code);
    if (same.length) return same;
  }
  const regions = new Set(roads.map((r) => r.properties.region));
  if (regions.size > 1) {
    const ncr = roads.filter((r) => r.properties.region === "NCR");
    if (ncr.length) return ncr;
  }
  return roads;
}

export function resolveLocation(index: RoadIndex, loc: LocationToPlace): ResolvedLocation {
  const point: Position | null =
    loc.latitude !== null && loc.longitude !== null && Math.abs(loc.latitude) <= 90 && Math.abs(loc.longitude) <= 180
      ? [loc.longitude, loc.latitude]
      : null;
  const found = loc.roads
    .map((name) => narrow(findRoads(index, name), loc.deo))
    .filter((roads) => roads.length > 0);
  const matched = found.map((roads) => roads[0]?.properties.name ?? "");
  const [first, second] = found;

  if (point) {
    const near = clipAround(found.flat(), point);
    return near.length
      ? { lines: near, point, matched, basis: "coordinates", places: 1 }
      : { lines: [], point, matched: [], basis: "point", places: 1 };
  }
  if (first && second) {
    const crossings = meetingPoints(first, second);
    const near = crossings.flatMap((c) => clipAround([...first, ...second], c));
    if (near.length) {
      return { lines: near, point: crossings[0] ?? null, matched: matched.slice(0, 2), basis: "intersection", places: crossings.length };
    }
  }
  if (first) {
    // One named road, or two that do not cross on the map: the first named (usually the main) road.
    return { lines: first.flatMap(lines), point: null, matched: matched.slice(0, 1), basis: "road", places: 1 };
  }
  return { lines: [], point: null, matched: [], basis: "none", places: 0 };
}

/** GeoJSON line feature for a resolved location. */
export function lineFeature<P extends object>(resolved: ResolvedLocation, properties: P): Feature<MultiLineString, P> | null {
  if (!resolved.lines.length) return null;
  return { type: "Feature", geometry: { type: "MultiLineString", coordinates: resolved.lines }, properties };
}
