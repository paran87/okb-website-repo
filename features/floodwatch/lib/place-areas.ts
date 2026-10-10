/**
 * Puts the Flood Prone Areas (Floodwatch) rows on the DPWH road network (public/data/road-network/roads.geojson)
 * for the Flood Monitoring overview.
 *
 * Each row names a road ("España Blvd.", "Buendia Extension (S03216LZ)") and its limits ("Antipolo St. to
 * A. Maceda St.", "Corner Tayuman St."). The road is found by its DPWH section code when the row gives one, else by
 * name within the row's District Engineering Office (or province, or region). The flood-prone spot on it is:
 *  - the row's own coordinates, when they are on that road;
 *  - else where the road meets the cross streets its limits name;
 *  - else the middle of the road section.
 * A quarter of the road section, centred on that spot, is highlighted. A row whose road is not on the network is
 * marked at its coordinates when Floodwatch has them (not a city or province centre); otherwise it is left off.
 */
import type { Position } from "geojson";
import type { FloodwatchArea } from "@/features/floodwatch/types";
import { buildRoadIndex, findRoads, meters, normalizeRoad, type RoadIndex } from "@/features/incident/lib/road-match";
import type { RoadFeature } from "@/features/road-network/types";

export interface PlacedArea {
  area: FloodwatchArea;
  /** The highlighted quarter of the road section (null when the road is not on the network). */
  line: Position[] | null;
  /** Where the area is marked. */
  at: Position;
  /** DPWH road section the stretch is on. */
  section: string | null;
}

/** The share of the road section that is highlighted. */
const SHARE = 1 / 4;
/** Coordinates farther than this from the named road (meters) are taken as not on it. */
const ON_ROAD = 1_500;

// ---- matching ---------------------------------------------------------------------------------------

const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** "REGION XI" = "Region XI", "CALABARZON" = "Region IV-A". */
function regionKey(region: string): string {
  const key = fold(region)
    .replace(/^region\s+/, "")
    .replace(/[^a-z0-9]/g, "");
  return ({ calabarzon: "iva", ivb: "mimaropa", caraga: "xiii", soccsksargen: "xii" } as Record<string, string>)[key] ?? key;
}

/** "Quezon City 2nd DEO" = "Quezon City 2nd District Engineering Office", "Malabon–Navotas" = "Malabon-Navotas". */
function deoKey(deo: string): string {
  return fold(deo)
    .replace(/district\s+engineering\s+office/g, "deo")
    .replace(/[^a-z0-9]/g, "");
}

const SECTION = /\b[SR]\d{5}[A-Z]{2}\b/g;
const DIRECTION = /\b(?:north|south|east|west)\s*-?\s*bound\b|\b(?:nb|sb|eb|wb|e\/w|n\/s)\b/gi;
/** Words in front of a cross street: "Corner Tayuman St.", "Fronting SM", "In front of …". */
const LEAD = /^\s*(?:at\s+the\s+)?(?:corner(?:\s+of)?|cor\.?|crnr\.?|fronting|in\s+front\s+of|near|along|before|after|from|between|intersection(?:\s+of|\s+with)?|junction(?:\s+of|\s+with)?)\s+/i;
const PARTS = /\s+(?:to|and|going\s+to|until)\s+|\s*[&/;,]\s*|\s+[-–—]\s+/i;

/** "T.M. Kalaw St." → "TM Kalaw St." (the network writes initials without dots). */
const joinInitials = (name: string) => name.replace(/\b([A-Za-z])\.\s*(?=[A-Za-z]\.)/g, "$1").replace(/\b([A-Z])([A-Z])\.\s+/g, "$1$2 ");

/** Road names a row's road field may stand for: "MSR - Quirino Avenue" → ["MSR - Quirino Avenue", "MSR", "Quirino Avenue"]. */
function roadNames(road: string): string[] {
  const bare = road.replace(/\([^)]*\)/g, " ").replace(DIRECTION, " ").replace(/\s+/g, " ").trim();
  return [bare, ...bare.split(PARTS)]
    .flatMap((p) => [p.trim(), joinInitials(p.trim())])
    .filter((p, i, all) => p.length >= 3 && all.indexOf(p) === i);
}

const ROAD_WORD = /\b(?:st|ave|rd|blvd|hwy|ext|dr|edsa|c 5|c 4)$/;

/** Cross streets the limits name: "Antipolo St. to A. Maceda St." → ["Antipolo St.", "A. Maceda St."] (road names only). */
function crossNames(limits: string): string[] {
  return limits
    .replace(/\([^)]*\)/g, " ")
    .split(PARTS)
    .map((p) => joinInitials(p.replace(LEAD, "").replace(LEAD, "").trim()))
    .filter((p) => ROAD_WORD.test(normalizeRoad(p)))
    .slice(0, 3);
}

/** Same-named sections narrowed to the row's DEO, else its province, else its region; none outside the region. */
function narrow(roads: RoadFeature[], area: FloodwatchArea): RoadFeature[] {
  const region = regionKey(area.region);
  const inRegion = roads.filter((r) => regionKey(r.properties.region) === region);
  const deo = deoKey(area.deo);
  const sameDeo = deo ? inRegion.filter((r) => deoKey(r.properties.deo) === deo) : [];
  if (sameDeo.length) return sameDeo;
  const province = fold(area.province);
  const sameProvince = inRegion.filter((r) => fold(r.properties.province) === province);
  return sameProvince.length ? sameProvince : inRegion;
}

export interface AreaIndex {
  names: RoadIndex;
  bySection: Map<string, RoadFeature[]>;
  /** Name lookups already made (rows repeat road names). */
  found: Map<string, RoadFeature[]>;
}

export function buildAreaIndex(roads: RoadFeature[]): AreaIndex {
  const bySection = new Map<string, RoadFeature[]>();
  for (const road of roads) {
    const code = road.properties.section;
    if (code) bySection.set(code, [...(bySection.get(code) ?? []), road]);
  }
  return { names: buildRoadIndex(roads), bySection, found: new Map() };
}

function lookup(index: AreaIndex, name: string): RoadFeature[] {
  const key = normalizeRoad(name);
  let roads = index.found.get(key);
  if (!roads) {
    roads = findRoads(index.names, name);
    index.found.set(key, roads);
  }
  return roads;
}

function findRoad(index: AreaIndex, area: FloodwatchArea): RoadFeature[] {
  const codes = `${area.road} ${area.limits}`.match(SECTION) ?? [];
  const bySection = codes.flatMap((c) => index.bySection.get(c) ?? []);
  if (bySection.length) return bySection;
  for (const name of roadNames(area.road)) {
    const found = narrow(lookup(index, name), area);
    if (found.length) return found;
  }
  return [];
}

// ---- geometry ---------------------------------------------------------------------------------------

type Box = [number, number, number, number];

function partsOf(road: RoadFeature): Position[][] {
  const g = road.geometry;
  return (g.type === "LineString" ? [g.coordinates] : g.coordinates).filter((l) => l.length > 1);
}

function boxOf(line: Position[], pad = 0): Box {
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const [x = 0, y = 0] of line) {
    w = Math.min(w, x);
    s = Math.min(s, y);
    e = Math.max(e, x);
    n = Math.max(n, y);
  }
  return [w - pad, s - pad, e + pad, n + pad];
}

const overlaps = (a: Box, b: Box) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
const inBox = ([x = 0, y = 0]: Position, b: Box) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3];

/** Running length (meters) at each vertex. */
function runningLength(line: Position[]): number[] {
  const out = [0];
  for (let i = 1; i < line.length; i++) out.push((out[i - 1] ?? 0) + meters(line[i - 1] as Position, line[i] as Position));
  return out;
}

interface Projection {
  /** The line it falls on. */
  line: Position[];
  /** Meters along that line. */
  along: number;
  /** Meters from the line. */
  distance: number;
  section: string;
}

/** Nearest place on [roads] to [p]. */
function project(roads: RoadFeature[], p: Position): Projection | null {
  let best: Projection | null = null;
  const cos = Math.cos(((p[1] ?? 0) * Math.PI) / 180);
  for (const road of roads) {
    for (const line of partsOf(road)) {
      const run = runningLength(line);
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1] as Position;
        const b = line[i] as Position;
        // Closest point on segment a–b (local flat projection).
        const ax = (a[0] ?? 0) * cos;
        const bx = (b[0] ?? 0) * cos;
        const px = (p[0] ?? 0) * cos;
        const [ay, by, py] = [a[1] ?? 0, b[1] ?? 0, p[1] ?? 0];
        const len2 = (bx - ax) ** 2 + (by - ay) ** 2;
        const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / len2)) : 0;
        const q: Position = [(a[0] ?? 0) + ((b[0] ?? 0) - (a[0] ?? 0)) * t, ay + (by - ay) * t];
        const distance = meters(p, q);
        if (!best || distance < best.distance) {
          best = { line, along: (run[i - 1] ?? 0) + meters(a, q), distance, section: road.properties.section };
        }
      }
    }
  }
  return best;
}

/** Splits long segments so consecutive vertices are at most [step] meters apart. */
function densify(line: Position[], step: number): Position[] {
  const out: Position[] = [];
  let q: Position | null = null;
  for (const p of line) {
    if (q) {
      const n = Math.floor(meters(q, p) / step);
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        out.push([(q[0] ?? 0) + ((p[0] ?? 0) - (q[0] ?? 0)) * t, (q[1] ?? 0) + ((p[1] ?? 0) - (q[1] ?? 0)) * t]);
      }
    }
    out.push(p);
    q = p;
  }
  return out;
}

/** Where [a] and [b] meet (closest vertices within 60 m), or null. Only the overlapping parts are compared. */
function meeting(a: RoadFeature[], b: RoadFeature[]): Position | null {
  const pad = 0.0006;
  let best: { d: number; p: Position } | null = null;
  const bParts = b.flatMap(partsOf).map((l) => ({ line: l, box: boxOf(l, pad) }));
  for (const la of a.flatMap(partsOf)) {
    const boxA = boxOf(la, pad);
    for (const { line: lb, box: boxB } of bParts) {
      if (!overlaps(boxA, boxB)) continue;
      const pa = densify(la, 25).filter((p) => inBox(p, boxB));
      const pb = densify(lb, 25).filter((p) => inBox(p, boxA));
      for (const p of pa) {
        for (const q of pb) {
          const d = meters(p, q);
          if (d <= 60 && (!best || d < best.d)) best = { d, p: [((p[0] ?? 0) + (q[0] ?? 0)) / 2, ((p[1] ?? 0) + (q[1] ?? 0)) / 2] };
        }
      }
    }
  }
  return best?.p ?? null;
}

/** The point [at] meters along [line] (with the running lengths [run]). */
function pointAt(line: Position[], run: number[], at: number): Position {
  for (let i = 1; i < line.length; i++) {
    const end = run[i] ?? 0;
    if (end >= at) {
      const start = run[i - 1] ?? 0;
      const t = end > start ? (at - start) / (end - start) : 0;
      const a = line[i - 1] as Position;
      const b = line[i] as Position;
      return [(a[0] ?? 0) + ((b[0] ?? 0) - (a[0] ?? 0)) * t, (a[1] ?? 0) + ((b[1] ?? 0) - (a[1] ?? 0)) * t];
    }
  }
  return line[line.length - 1] as Position;
}

/** The part of [line] from [from] to [to] meters along it. */
function slice(line: Position[], run: number[], from: number, to: number): Position[] {
  const out: Position[] = [pointAt(line, run, from)];
  for (let i = 0; i < line.length; i++) {
    const d = run[i] ?? 0;
    if (d > from && d < to) out.push(line[i] as Position);
  }
  out.push(pointAt(line, run, to));
  return out;
}

/** The [SHARE] of the section around [p.along], kept inside the section; [at] is the spot on the road. */
function quarter(p: Projection): { line: Position[]; at: Position } {
  const run = runningLength(p.line);
  const total = run[run.length - 1] ?? 0;
  const length = total * SHARE;
  const from = Math.max(0, Math.min(total - length, p.along - length / 2));
  return { line: slice(p.line, run, from, from + length), at: pointAt(p.line, run, p.along) };
}

/** The middle of the longest section. */
function middle(roads: RoadFeature[]): Projection | null {
  let best: Projection | null = null;
  let longest = -1;
  for (const road of roads) {
    for (const line of partsOf(road)) {
      const run = runningLength(line);
      const total = run[run.length - 1] ?? 0;
      if (total > longest) {
        longest = total;
        best = { line, along: total / 2, distance: 0, section: road.properties.section };
      }
    }
  }
  return best;
}

// ---- placing ----------------------------------------------------------------------------------------

export function placeArea(index: AreaIndex, area: FloodwatchArea): PlacedArea | null {
  const point: Position | null =
    area.latitude !== null && area.longitude !== null && Math.abs(area.latitude) <= 90 && Math.abs(area.longitude) <= 180
      ? [area.longitude, area.latitude]
      : null;
  const road = findRoad(index, area);

  if (road.length) {
    let spot = point && !area.approximate ? project(road, point) : null;
    if (spot && spot.distance > ON_ROAD) spot = null;
    if (!spot) {
      const crossings: Position[] = [];
      for (const name of crossNames(area.limits)) {
        const region = regionKey(area.region);
        const cross = lookup(index, name).filter((r) => !road.includes(r) && regionKey(r.properties.region) === region);
        const at = cross.length ? meeting(road, cross) : null;
        if (at) crossings.push(at);
        if (crossings.length === 2) break;
      }
      const [first, second] = crossings.map((c) => project(road, c));
      // Between two cross streets on the same line: halfway between them.
      spot = first && second && first.line === second.line ? { ...first, along: (first.along + second.along) / 2 } : (first ?? null);
    }
    spot ??= middle(road);
    if (spot) return { area, ...quarter(spot), section: spot.section };
  }

  if (point && !area.approximate) return { area, line: null, at: point, section: null };
  return null;
}

/** Every area that can be put on the map. */
export function placeAreas(index: AreaIndex, areas: FloodwatchArea[]): PlacedArea[] {
  return areas.map((area) => placeArea(index, area)).filter((p): p is PlacedArea => p !== null);
}
