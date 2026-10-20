import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Position } from "geojson";
import { logger } from "@/lib/logger";
import { buildRoadIndex, resolveLocation, type LocationToPlace, type RoadIndex } from "@/features/incident/lib/road-match";
import type { RoadFeature } from "@/features/road-network/types";

/**
 * The DPWH road network on the server, to place report locations that give road names but no coordinates
 * (most WhatsApp / Viber reports) the same way the Incidents map does in the browser. The file is bundled
 * with the routes that use it (outputFileTracingIncludes in next.config.ts).
 */

const log = logger.child({ module: "roads" });
const FILE = path.join(process.cwd(), "public", "data", "road-network", "roads.geojson");
let loading: Promise<{ roads: RoadFeature[]; index: RoadIndex } | null> | null = null;

function serverRoads(): Promise<{ roads: RoadFeature[]; index: RoadIndex } | null> {
  loading ??= readFile(FILE, "utf8")
    .then((text) => {
      const roads = (JSON.parse(text) as { features: RoadFeature[] }).features;
      return { roads, index: buildRoadIndex(roads) };
    })
    .catch((err) => {
      log.warn({ err }, "Road network could not be loaded; reports without coordinates are left off the map");
      loading = null;
      return null;
    });
  return loading;
}

export async function serverRoadIndex(): Promise<RoadIndex | null> {
  return (await serverRoads())?.index ?? null;
}

const linesOf = (road: RoadFeature): Position[][] =>
  road.geometry.type === "LineString" ? [road.geometry.coordinates] : road.geometry.coordinates;

/** Each road's bounding box [w, s, e, n] (computed once). */
const boxes = new WeakMap<RoadFeature, [number, number, number, number]>();
function boxOf(road: RoadFeature): [number, number, number, number] {
  let box = boxes.get(road);
  if (!box) {
    box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const line of linesOf(road)) {
      for (const [x = 0, y = 0] of line) box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)];
    }
    boxes.set(road, box);
  }
  return box;
}

/**
 * The District Engineering Office of the national road nearest to a point (within [maxM] meters), as the
 * report form suggests it ("North Manila District Engineering Office"). Null when no road is that close.
 */
export async function nearestDeo(latitude: number, longitude: number, maxM = 1500): Promise<string | null> {
  const loaded = await serverRoads();
  if (!loaded) return null;
  // Degrees → meters near this latitude (equirectangular; fine at street scale).
  const ky = 111_320;
  const kx = ky * Math.cos((latitude * Math.PI) / 180);
  const pad = maxM / ky;
  let best: { m: number; deo: string } | null = null;
  for (const road of loaded.roads) {
    const deo = road.properties.deo;
    if (!deo) continue;
    const [w, s, e, n] = boxOf(road);
    if (longitude < w - pad * 1.2 || longitude > e + pad * 1.2 || latitude < s - pad || latitude > n + pad) continue;
    for (const line of linesOf(road)) {
      for (let i = 1; i < line.length; i++) {
        const [ax = 0, ay = 0] = line[i - 1] ?? [];
        const [bx = 0, by = 0] = line[i] ?? [];
        // Distance from the point to segment a–b, in meters.
        const dx = (bx - ax) * kx;
        const dy = (by - ay) * ky;
        const px = (longitude - ax) * kx;
        const py = (latitude - ay) * ky;
        const t = dx || dy ? Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy))) : 0;
        const m = Math.hypot(px - t * dx, py - t * dy);
        if (m <= maxM && (!best || m < best.m)) best = { m, deo };
      }
    }
  }
  return best?.deo ?? null;
}

const span = (a: Position, b: Position) => Math.hypot((b[0] ?? 0) - (a[0] ?? 0), (b[1] ?? 0) - (a[1] ?? 0));
const lengthOf = (line: Position[]) => line.reduce((sum, p, i) => (i ? sum + span(line[i - 1] ?? p, p) : 0), 0);

/** The point halfway along a line. */
function halfway(line: Position[]): Position | null {
  let rest = lengthOf(line) / 2;
  for (let i = 1; i < line.length; i++) {
    const [a = [0, 0], b = [0, 0]] = [line[i - 1], line[i]];
    const d = span(a, b);
    if (d >= rest && d > 0) {
      const t = rest / d;
      return [(a[0] ?? 0) + ((b[0] ?? 0) - (a[0] ?? 0)) * t, (a[1] ?? 0) + ((b[1] ?? 0) - (a[1] ?? 0)) * t];
    }
    rest -= d;
  }
  return line[0] ?? null;
}

/**
 * Where to put a pin for a report location: its coordinates, else where its roads meet, else halfway along
 * its longest matched road stretch (as the Incidents map places its alert). Null when it cannot be placed.
 */
export function pinOf(index: RoadIndex | null, loc: LocationToPlace): { latitude: number; longitude: number } | null {
  if (loc.latitude !== null && loc.longitude !== null && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
    return { latitude: loc.latitude, longitude: loc.longitude };
  }
  if (!index) return null;
  const resolved = resolveLocation(index, loc);
  const longest = resolved.lines.reduce<Position[]>((a, b) => (lengthOf(b) > lengthOf(a) ? b : a), []);
  const at = resolved.point ?? halfway(longest);
  if (!at || !Number.isFinite(at[0]) || !Number.isFinite(at[1])) return null;
  return { latitude: at[1] as number, longitude: at[0] as number };
}
