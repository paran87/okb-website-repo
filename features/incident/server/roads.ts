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
let loading: Promise<RoadIndex | null> | null = null;

export function serverRoadIndex(): Promise<RoadIndex | null> {
  loading ??= readFile(FILE, "utf8")
    .then((text) => buildRoadIndex((JSON.parse(text) as { features: RoadFeature[] }).features))
    .catch((err) => {
      log.warn({ err }, "Road network could not be loaded; reports without coordinates are left off the map");
      loading = null;
      return null;
    });
  return loading;
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
