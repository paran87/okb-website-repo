import "server-only";
import type { Position } from "geojson";
import { logger } from "@/lib/logger";
import { boxOf, linesOf, serverRoadList } from "@/features/incident/server/roads";
import type { RoadFeature } from "@/features/road-network/types";
import {
  formatMeters,
  STRETCH_ACCURACY_M,
  STRETCH_MAX_DETOUR,
  STRETCH_MAX_M,
  STRETCH_MAX_SPAN_H,
  STRETCH_MAX_SPEED_KMH,
  STRETCH_MIN_M,
  STRETCH_ON_ROAD_M,
  VIDEO_END_SECONDS,
  VIDEO_MOVE_MIN_M,
  VIDEO_TRACK_ACCURACY_M,
  type PhotoVerdict,
  type StoredStretch,
  type StretchResult,
} from "@/features/flood-report/lib/stretch";
import { checkPhotos, photoCheckConfigured } from "@/features/flood-report/server/photo-check";
import type { TrackPoint, UploadedPhoto, UploadedVideo } from "@/features/flood-report/types";

/**
 * Decides whether the photos of one OKB Mobile report show a flooded stretch of road (drawn from the first
 * flooded photo to the last) or one spot (a pin), and why:
 *
 *  1. Photos with poor GPS (worse than ±50 m) are left out.
 *  2. The two photos farthest apart are the ends. Closer than 50 m (or than their GPS error): one spot.
 *     Farther than 2 km: too far for one flood report.
 *  3. Photos taken more than 3 h apart, or faster than 60 km/h from one to the next, are not one walk through
 *     one flood (a wrong or borrowed geotag).
 *  4. Both ends must be within 35 m of a road, connected by it by a route not much longer than the straight
 *     distance: first the DPWH national road network, else OpenStreetMap streets (OSRM); otherwise they are off
 *     the roads, or on different roads.
 *  5. Only when all of that holds, AI looks at the photos (when an Anthropic API key is set). A photo that shows
 *     no floodwater is dropped and the stretch is worked out again from the flooded photos only.
 *
 * Anything but a stretch leaves the report as one pin at the location the sender confirmed, with the reason
 * stored for OKB operators.
 */

const log = logger.child({ module: "flood-stretch" });
const HOUR = 3_600_000;

/** A photo (n: its number) or one end of a video (n: 0), with how the reasons name it. */
type Photo = UploadedPhoto & { n: number; label?: string };

const nameOf = (p: Photo) => p.label ?? `photo ${p.n}`;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** "photos 1 and 3", or "the start and end of the video". */
const both = (a: Photo, b: Photo) => (a.label || b.label ? "the start and end of the video" : `photos ${a.n} and ${b.n}`);
const offText = (off: Photo[]) =>
  off.length === 2 && off.every((p) => p.label) ? "Both ends of the video are" : off.length === 1 ? `${cap(nameOf(off[0] as Photo))} is` : `${cap(both(off[0] as Photo, off[1] as Photo))} are`;

interface Geometry {
  result: StretchResult;
  reason: string;
  line?: [number, number][];
  lengthM?: number;
  roads?: string[];
  mid?: [number, number];
  ends?: [number, number];
}

// ---- local meters ------------------------------------------------------------------------------------

const KY = 111_320;
const kxAt = (lat: number) => KY * Math.cos((lat * Math.PI) / 180);
const dist = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) =>
  Math.hypot((b.longitude - a.longitude) * kxAt((a.latitude + b.latitude) / 2), (b.latitude - a.latitude) * KY);

const listN = (ns: number[]) => (ns.length === 1 ? `Photo ${ns[0]}` : `Photos ${ns.slice(0, -1).join(", ")} and ${ns.at(-1)}`);

// ---- road graph --------------------------------------------------------------------------------------

/** Road vertices this close (meters) on different lines are joined (section ends, crossings). */
const LINK_M = 15;
/** Lines are split so no two vertices are farther apart than this (meters). */
const STEP_M = 20;

interface Graph {
  x: number[];
  y: number[];
  lng: number[];
  lat: number[];
  road: string[];
  edges: { to: number; w: number }[][];
}

function buildGraph(roads: RoadFeature[], box: [number, number, number, number], lat0: number): Graph {
  const kx = kxAt(lat0);
  const g: Graph = { x: [], y: [], lng: [], lat: [], road: [], edges: [] };
  const lineOf: number[] = [];
  let lineId = 0;
  const add = (p: Position, road: string, line: number) => {
    const [lng = 0, lat = 0] = p;
    g.x.push(lng * kx);
    g.y.push(lat * KY);
    g.lng.push(lng);
    g.lat.push(lat);
    g.road.push(road);
    g.edges.push([]);
    lineOf.push(line);
    return g.x.length - 1;
  };
  const link = (a: number, b: number) => {
    const w = Math.hypot((g.x[b] ?? 0) - (g.x[a] ?? 0), (g.y[b] ?? 0) - (g.y[a] ?? 0));
    g.edges[a]?.push({ to: b, w });
    g.edges[b]?.push({ to: a, w });
  };
  for (const road of roads) {
    const [w, s, e, n] = boxOf(road);
    if (e < box[0] || w > box[2] || n < box[1] || s > box[3]) continue;
    for (const line of linesOf(road)) {
      let prev: number | null = null;
      let q: Position | null = null;
      lineId++;
      for (const p of line) {
        if (q) {
          // Split long segments so crossings and snapping find a vertex nearby.
          const steps = Math.floor(Math.hypot(((p[0] ?? 0) - (q[0] ?? 0)) * kx, ((p[1] ?? 0) - (q[1] ?? 0)) * KY) / STEP_M);
          for (let k = 1; k <= steps; k++) {
            const t = k / (steps + 1);
            const mid = add([(q[0] ?? 0) + ((p[0] ?? 0) - (q[0] ?? 0)) * t, (q[1] ?? 0) + ((p[1] ?? 0) - (q[1] ?? 0)) * t], road.properties.name, lineId);
            if (prev !== null) link(prev, mid);
            prev = mid;
          }
        }
        const id = add(p, road.properties.name, lineId);
        if (prev !== null) link(prev, id);
        prev = id;
        q = p;
      }
    }
  }
  // Join vertices of different lines that (nearly) touch: where sections meet and where roads cross.
  const cell = new Map<string, number[]>();
  const keyOf = (x: number, y: number) => `${Math.floor(x / LINK_M)},${Math.floor(y / LINK_M)}`;
  g.x.forEach((x, i) => {
    const k = keyOf(x, g.y[i] ?? 0);
    const list = cell.get(k);
    if (list) list.push(i);
    else cell.set(k, [i]);
  });
  g.x.forEach((x, i) => {
    const y = g.y[i] ?? 0;
    const cx = Math.floor(x / LINK_M);
    const cy = Math.floor(y / LINK_M);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const j of cell.get(`${cx + dx},${cy + dy}`) ?? []) {
          if (j <= i || lineOf[j] === lineOf[i]) continue;
          if (Math.hypot((g.x[j] ?? 0) - x, (g.y[j] ?? 0) - y) <= LINK_M) link(i, j);
        }
      }
    }
  });
  return g;
}

/** The road vertex nearest to a point, within [maxM] meters. */
function snap(g: Graph, p: { latitude: number; longitude: number }, maxM: number): number | null {
  const kx = kxAt(p.latitude);
  let best: { i: number; m: number } | null = null;
  for (let i = 0; i < g.x.length; i++) {
    const m = Math.hypot(((g.lng[i] ?? 0) - p.longitude) * kx, ((g.lat[i] ?? 0) - p.latitude) * KY);
    if (m <= maxM && (!best || m < best.m)) best = { i, m };
  }
  return best?.i ?? null;
}

/** Shortest route along the roads (Dijkstra), as vertex ids; null when the roads do not connect. */
function route(g: Graph, from: number, to: number): { path: number[]; m: number } | null {
  const n = g.x.length;
  const d = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const heap: [number, number][] = [[0, from]];
  d[from] = 0;
  const push = (item: [number, number]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if ((heap[parent]?.[0] ?? 0) <= item[0]) break;
      heap[i] = heap[parent] as [number, number];
      i = parent;
    }
    heap[i] = item;
  };
  const pop = (): [number, number] | undefined => {
    const top = heap[0];
    const last = heap.pop();
    if (!heap.length || !last) return top;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = -1;
      let low = last[0];
      if (l < heap.length && (heap[l]?.[0] ?? 0) < low) [m, low] = [l, heap[l]?.[0] ?? 0];
      if (r < heap.length && (heap[r]?.[0] ?? 0) < low) m = r;
      if (m < 0) break;
      heap[i] = heap[m] as [number, number];
      i = m;
    }
    heap[i] = last;
    return top;
  };
  for (let item = pop(); item; item = pop()) {
    const [du, u] = item;
    if (du > (d[u] ?? Infinity)) continue;
    if (u === to) break;
    for (const { to: v, w } of g.edges[u] ?? []) {
      const dv = du + w;
      if (dv < (d[v] ?? Infinity)) {
        d[v] = dv;
        prev[v] = u;
        push([dv, v]);
      }
    }
  }
  if (!Number.isFinite(d[to] ?? Infinity)) return null;
  const path: number[] = [];
  for (let v = to; v !== -1; v = prev[v] ?? -1) path.unshift(v);
  return { path, m: d[to] ?? 0 };
}

const round6 = (v: number) => Math.round(v * 1e6) / 1e6;

/** The point halfway along a route. */
function halfway(g: Graph, path: number[], total: number): [number, number] {
  let rest = total / 2;
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1] ?? 0;
    const b = path[k] ?? 0;
    const seg = Math.hypot((g.x[b] ?? 0) - (g.x[a] ?? 0), (g.y[b] ?? 0) - (g.y[a] ?? 0));
    if (seg >= rest && seg > 0) {
      const t = rest / seg;
      return [round6((g.lng[a] ?? 0) + ((g.lng[b] ?? 0) - (g.lng[a] ?? 0)) * t), round6((g.lat[a] ?? 0) + ((g.lat[b] ?? 0) - (g.lat[a] ?? 0)) * t)];
    }
    rest -= seg;
  }
  const v = path[0] ?? 0;
  return [round6(g.lng[v] ?? 0), round6(g.lat[v] ?? 0)];
}

// ---- the decision ------------------------------------------------------------------------------------

/** Where the photos are, as the map should show them (no AI involved). */
export async function placePhotos(photos: Photo[]): Promise<Geometry> {
  if (photos.length < 2) return { result: "single_photo", reason: "One photo: shown as a pin at the reported location." };
  const usable = photos.filter((p) => p.accuracyM === null || p.accuracyM <= STRETCH_ACCURACY_M);
  if (usable.length < 2) {
    return {
      result: "low_accuracy",
      reason: `The phone's GPS was not precise enough (worse than ±${STRETCH_ACCURACY_M} m) to draw a flooded stretch, so the report is one pin.`,
    };
  }

  // The two photos farthest apart are the ends of the stretch.
  let a = usable[0] as Photo;
  let b = usable[1] as Photo;
  let far = -1;
  for (let i = 0; i < usable.length; i++) {
    for (let j = i + 1; j < usable.length; j++) {
      const m = dist(usable[i] as Photo, usable[j] as Photo);
      if (m > far) [far, a, b] = [m, usable[i] as Photo, usable[j] as Photo];
    }
  }
  if (a.n > b.n) [a, b] = [b, a];
  const gpsError = (a.accuracyM ?? 0) + (b.accuracyM ?? 0);
  if (far < Math.max(STRETCH_MIN_M, gpsError)) {
    return {
      result: "one_spot",
      reason: `The photos were taken within ${formatMeters(Math.max(far, 1))} of each other (less than ${far < STRETCH_MIN_M ? `the ${STRETCH_MIN_M} m standard` : "the GPS error"}), so they show one spot.`,
    };
  }
  if (far > STRETCH_MAX_M) {
    return {
      result: "too_far",
      reason: `Photos ${a.n} and ${b.n} were taken ${formatMeters(far)} apart, too far for one flooded stretch (limit ${formatMeters(STRETCH_MAX_M)}). Shown as one pin at the reported location for OKB operators to check.`,
    };
  }

  // One walk (or ride) through one flood: photos close in time, and no impossible speed between them.
  const byTime = [...usable].sort((p, q) => Date.parse(p.takenAt) - Date.parse(q.takenAt));
  const first = Date.parse(byTime[0]?.takenAt ?? "");
  const last = Date.parse(byTime.at(-1)?.takenAt ?? "");
  if (Number.isFinite(first) && Number.isFinite(last) && last - first > STRETCH_MAX_SPAN_H * HOUR) {
    return {
      result: "unrealistic",
      reason: `The photos were taken ${((last - first) / HOUR).toFixed(1)} hours apart, so they show different moments, not one flooded stretch. Shown as one pin.`,
    };
  }
  for (let k = 1; k < byTime.length; k++) {
    const p = byTime[k - 1] as Photo;
    const q = byTime[k] as Photo;
    const m = dist(p, q);
    const seconds = Math.abs(Date.parse(q.takenAt) - Date.parse(p.takenAt)) / 1000;
    // At least 10 s, so GPS settling between two quick photos does not count as speed.
    const kmh = (m / Math.max(10, seconds)) * 3.6;
    if (m >= STRETCH_MIN_M && kmh > STRETCH_MAX_SPEED_KMH) {
      return {
        result: "unrealistic",
        reason: `Photos ${p.n} and ${q.n} were taken ${formatMeters(m)} apart, only ${seconds < 60 ? `${Math.max(1, Math.round(seconds))} seconds` : `${Math.round(seconds / 60)} minutes`} after each other (over ${STRETCH_MAX_SPEED_KMH} km/h), faster than anyone moves through a flood, so their locations are not trusted. Shown as one pin.`,
      };
    }
  }

  // National roads first (the program's network); streets from OpenStreetMap when the photos are not on one.
  const national = await nationalRoute(a, b, far);
  if (national.result === "stretch") return national;
  const street = await streetRoute(a, b, far);
  return street ?? national;
}

const reachOf = (p: Photo) => STRETCH_ON_ROAD_M + Math.min(p.accuracyM ?? 0, 15);

/** The stretch along the DPWH national road network (roads.geojson), or why there is none. */
async function nationalRoute(a: Photo, b: Photo, far: number): Promise<Geometry> {
  const roads = await serverRoadList();
  if (!roads) return { result: "off_network", reason: "The road network could not be loaded, so the report is one pin." };
  const pad = 300 / KY;
  const box: [number, number, number, number] = [
    Math.min(a.longitude, b.longitude) - pad * 1.1,
    Math.min(a.latitude, b.latitude) - pad,
    Math.max(a.longitude, b.longitude) + pad * 1.1,
    Math.max(a.latitude, b.latitude) + pad,
  ];
  const g = buildGraph(roads, box, (a.latitude + b.latitude) / 2);
  const from = snap(g, a, reachOf(a));
  const to = snap(g, b, reachOf(b));
  if (from === null || to === null) {
    const off = [from === null ? a : null, to === null ? b : null].filter((p): p is Photo => p !== null);
    return {
      result: "off_network",
      reason: `${offText(off)} not on a national road of the DPWH road network, so the stretch cannot be traced along the road. Shown as one pin.`,
    };
  }
  const found = route(g, from, to);
  if (!found) {
    return {
      result: "not_connected",
      reason: `${cap(both(a, b))} are on roads that do not connect on the DPWH road network, so they are not one flooded stretch. Shown as one pin.`,
    };
  }
  if (found.m > far * STRETCH_MAX_DETOUR + 100) {
    return {
      result: "indirect",
      reason: `The road route between ${both(a, b)} (${formatMeters(found.m)}) is much longer than the ${formatMeters(far)} between them, so they are likely on different roads. Shown as one pin.`,
    };
  }
  // Roads the stretch runs along (not ones it only touches where it crosses them), in order.
  const along = new Map<string, number>();
  for (let k = 1; k < found.path.length; k++) {
    const u = found.path[k - 1] ?? 0;
    const v = found.path[k] ?? 0;
    const name = g.road[v] ?? "";
    if (name && name === g.road[u]) along.set(name, (along.get(name) ?? 0) + Math.hypot((g.x[v] ?? 0) - (g.x[u] ?? 0), (g.y[v] ?? 0) - (g.y[u] ?? 0)));
  }
  // Short stretches (a video filmed over a few dozen meters) still name their road.
  const names = [...along].filter(([, m]) => m >= Math.min(30, found.m * 0.4)).map(([name]) => name);
  const line = found.path.map((v): [number, number] => [round6(g.lng[v] ?? 0), round6(g.lat[v] ?? 0)]);
  return {
    result: "stretch",
    reason: `Flooded for about ${formatMeters(found.m)} along ${names.slice(0, 3).join(", ") || "the road"}, from ${nameOf(a)} to ${nameOf(b)}.`,
    line,
    lengthM: Math.round(found.m),
    roads: names,
    mid: halfway(g, found.path, found.m),
    ends: [a.n, b.n],
  };
}

// ---- streets that are not national roads (OpenStreetMap) ---------------------------------------------

/**
 * OSRM on OpenStreetMap, walking profile (FOSSGIS, the service openstreetmap.org uses for directions): the street
 * route between two points and how far each point is from a street. Walking, so one-way streets do not bend
 * the route. Used only for reports whose photos are far apart and off the national roads, so a few requests a day.
 */
const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

interface OsrmRoute {
  code: string;
  routes?: { distance: number; geometry: { coordinates: [number, number][] }; legs?: { steps?: { name?: string; distance: number }[] }[] }[];
  waypoints?: { distance: number }[];
}

/** The point halfway along a [lng, lat] line. */
function lineHalfway(line: [number, number][]): [number, number] {
  const seg = (p: [number, number], q: [number, number]) => dist({ latitude: p[1], longitude: p[0] }, { latitude: q[1], longitude: q[0] });
  let rest = line.reduce((sum, p, i) => (i ? sum + seg(line[i - 1] as [number, number], p) : 0), 0) / 2;
  for (let i = 1; i < line.length; i++) {
    const p = line[i - 1] as [number, number];
    const q = line[i] as [number, number];
    const d = seg(p, q);
    if (d >= rest && d > 0) return [round6(p[0] + ((q[0] - p[0]) * rest) / d), round6(p[1] + ((q[1] - p[1]) * rest) / d)];
    rest -= d;
  }
  const first = line[0] ?? [0, 0];
  return [round6(first[0]), round6(first[1])];
}

/** The stretch along OpenStreetMap streets, or why there is none; null when the routing service did not answer. */
async function streetRoute(a: Photo, b: Photo, far: number): Promise<Geometry | null> {
  let data: OsrmRoute;
  try {
    const res = await fetch(`${OSRM}/${a.longitude},${a.latitude};${b.longitude},${b.latitude}?overview=full&geometries=geojson&steps=true`, {
      headers: { "User-Agent": "OKB Command Center (okb-ousc.site)" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    data = (await res.json()) as OsrmRoute;
  } catch (err) {
    log.warn({ err }, "Street routing (OpenStreetMap) unavailable; only national roads were tried");
    return null;
  }
  const found = data.routes?.[0];
  const [wa, wb] = data.waypoints ?? [];
  if (data.code !== "Ok" || !found || !wa || !wb) return null;
  const off = [wa.distance > reachOf(a) ? a : null, wb.distance > reachOf(b) ? b : null].filter((p): p is Photo => p !== null);
  if (off.length) {
    return {
      result: "off_network",
      reason: `${offText(off)} not on a national road or a mapped street (more than ${STRETCH_ON_ROAD_M} m away), so the stretch cannot be traced along the road. Shown as one pin.`,
    };
  }
  if (found.distance > far * STRETCH_MAX_DETOUR + 100) {
    return {
      result: "indirect",
      reason: `The street route between ${both(a, b)} (${formatMeters(found.distance)}) is much longer than the ${formatMeters(far)} between them, so they are likely on different streets. Shown as one pin.`,
    };
  }
  const line = found.geometry.coordinates.map(([x, y]): [number, number] => [round6(x), round6(y)]);
  if (line.length < 2) return null;
  const along = new Map<string, number>();
  for (const step of found.legs?.flatMap((l) => l.steps ?? []) ?? []) {
    if (step.name) along.set(step.name, (along.get(step.name) ?? 0) + step.distance);
  }
  const names = [...along].filter(([, m]) => m >= Math.min(30, found.distance * 0.4)).map(([name]) => name);
  return {
    result: "stretch",
    reason: `Flooded for about ${formatMeters(found.distance)} along ${names.slice(0, 3).join(", ") || "the street"} (a local street, from OpenStreetMap), from ${nameOf(a)} to ${nameOf(b)}.`,
    line,
    lengthM: Math.round(found.distance),
    roads: names,
    mid: lineHalfway(line),
    ends: [a.n, b.n],
  };
}

const stored = (geo: Geometry, photoCheck: StoredStretch["photoCheck"], verdicts: Record<string, PhotoVerdict>): StoredStretch => ({
  version: 2,
  analyzedAt: new Date().toISOString(),
  result: geo.result,
  reason: geo.reason,
  line: geo.line ?? null,
  lengthM: geo.lengthM ?? null,
  roads: geo.roads ?? [],
  mid: geo.mid ?? null,
  ends: geo.ends ?? null,
  photoCheck,
  verdicts,
});

/**
 * The stretch of a report (stored with it). [known]: AI verdicts from an earlier analysis of the same photos,
 * so an edit only sends the new photos to the AI.
 */
export async function analyzeStretch(
  photos: UploadedPhoto[],
  known: Record<string, PhotoVerdict> = {},
  videos: UploadedVideo[] = [],
): Promise<StoredStretch> {
  const fromPhotos = await analyzePhotos(photos, known);
  const video = videos[0];
  // The photos draw the stretch when they can; otherwise a video filmed on the move does.
  if (!video || fromPhotos.result === "stretch") return fromPhotos;
  const fromVideo = await analyzeVideo(video, known);
  // With one photo or none, the video's reason is the one to show; with more, the photos' reason stays unless the video draws a stretch.
  return fromVideo.result === "stretch" || photos.length < 2 ? fromVideo : fromPhotos;
}

async function analyzePhotos(photos: UploadedPhoto[], known: Record<string, PhotoVerdict>): Promise<StoredStretch> {
  const numbered = photos.map((p, i) => ({ ...p, n: i + 1 }));
  try {
    const geo = await placePhotos(numbered);
    // Only a stretch needs the photos checked: a pin stays where the sender put it.
    if (geo.result !== "stretch") return stored(geo, "not_needed", {});
    if (!photoCheckConfigured()) return stored(geo, "not_configured", {});

    const verdicts: Record<string, PhotoVerdict> = {};
    for (const p of photos) if (known[p.key]) verdicts[p.key] = known[p.key] as PhotoVerdict;
    const missing = photos.filter((p) => !verdicts[p.key]);
    if (missing.length) {
      const checked = await checkPhotos(photos.map((p) => p.key), missing.map((p) => p.key));
      if (!checked) return stored(geo, "failed", verdicts);
      Object.assign(verdicts, checked);
    }

    const dry = numbered.filter((p) => verdicts[p.key]?.flooded === "no");
    if (!dry.length) return stored({ ...geo, reason: `${geo.reason} AI checked the photos for floodwater.` }, "ai", verdicts);
    // Draw the stretch again from the photos that show floodwater only.
    const wet = numbered.filter((p) => verdicts[p.key]?.flooded !== "no");
    const again = await placePhotos(wet);
    const dryText = `${listN(dry.map((p) => p.n))} ${dry.length === 1 ? "shows" : "show"} no floodwater (AI check)`;
    if (again.result === "stretch") return stored({ ...again, reason: `${again.reason} ${dryText}, so the stretch ends at the flooded photos.` }, "ai", verdicts);
    return stored(
      {
        result: "not_flooded",
        reason: wet.length
          ? `${dryText}, so the flood is shown as one pin instead of a stretch.`
          : `${dryText}; the report is one pin at the reported location for OKB operators to check.`,
      },
      "ai",
      verdicts,
    );
  } catch (err) {
    log.warn({ err }, "Flood stretch analysis failed; the report stays one pin");
    return stored({ result: "single_photo", reason: "The photo locations could not be analyzed; shown as one pin." }, "failed", {});
  }
}

// ---- a video filmed on the move ----------------------------------------------------------------------

/** Average of some track points (their place and GPS error). */
function middle(points: TrackPoint[]): { latitude: number; longitude: number; accuracyM: number | null } {
  const n = points.length || 1;
  const acc = points.map((p) => p.accuracyM).filter((a): a is number => a !== null);
  return {
    latitude: points.reduce((sum, p) => sum + p.latitude, 0) / n,
    longitude: points.reduce((sum, p) => sum + p.longitude, 0) / n,
    accuracyM: acc.length ? acc.reduce((a, b) => a + b, 0) / acc.length : null,
  };
}

/**
 * Where a video was filmed: one spot (a pin) when the phone stayed within VIDEO_MOVE_MIN_M (or within its GPS
 * error) from the start of the video to its end, else the stretch of road between where it started and where it
 * ended, with the same road checks as photos. The start and end places are the average of the GPS fixes of the
 * first and last seconds, so GPS jitter of a phone held still does not count as moving.
 */
export async function placeVideo(video: UploadedVideo): Promise<Geometry> {
  const points = (video.track ?? []).filter((p) => p.accuracyM === null || p.accuracyM <= VIDEO_TRACK_ACCURACY_M).sort((p, q) => p.t - q.t);
  if (points.length < 2) {
    return {
      result: "one_spot",
      reason: "The video's GPS stayed in one place (or was not precise enough to follow), so the video shows one spot.",
    };
  }
  const first = points[0] as TrackPoint;
  const last = points.at(-1) as TrackPoint;
  const start = middle(points.filter((p) => p.t <= first.t + VIDEO_END_SECONDS));
  const end = middle(points.filter((p) => p.t >= last.t - VIDEO_END_SECONDS));
  const moved = dist(start, end);
  const gpsError = ((start.accuracyM ?? 0) + (end.accuracyM ?? 0)) / 2;
  if (moved < Math.max(VIDEO_MOVE_MIN_M, gpsError)) {
    return {
      result: "one_spot",
      reason: `The video was filmed from one spot: the phone moved about ${Math.max(1, Math.round(moved))} m (less than ${
        moved < VIDEO_MOVE_MIN_M ? `the ${VIDEO_MOVE_MIN_M} m standard` : "the GPS error"
      }), so it is shown as one pin.`,
    };
  }
  if (moved > STRETCH_MAX_M) {
    return { result: "too_far", reason: `The phone moved ${formatMeters(moved)} during the video, too far for one flooded stretch. Shown as one pin.` };
  }
  const seconds = Math.max(1, last.t - first.t);
  if ((moved / seconds) * 3.6 > STRETCH_MAX_SPEED_KMH) {
    return {
      result: "unrealistic",
      reason: `The phone moved ${formatMeters(moved)} in ${Math.round(seconds)} seconds during the video (over ${STRETCH_MAX_SPEED_KMH} km/h), so its locations are not trusted. Shown as one pin.`,
    };
  }
  const takenAt = (t: number) => new Date(Date.parse(video.takenAt) + t * 1000).toISOString();
  const a: Photo = { key: video.posterKey, n: 0, label: "the start of the video", ...start, takenAt: takenAt(first.t) };
  const b: Photo = { key: video.endPosterKey ?? video.posterKey, n: 0, label: "the end of the video", ...end, takenAt: takenAt(last.t) };
  const national = await nationalRoute(a, b, moved);
  const geo = national.result === "stretch" ? national : ((await streetRoute(a, b, moved)) ?? national);
  return geo.result === "stretch" ? { ...geo, ends: [0, 0] } : geo;
}

/** The stretch of a video's report, with the AI looking at the video's first and last frames (when it can). */
async function analyzeVideo(video: UploadedVideo, known: Record<string, PhotoVerdict>): Promise<StoredStretch> {
  try {
    const geo = await placeVideo(video);
    if (geo.result !== "stretch") return stored(geo, "not_needed", {});
    if (!photoCheckConfigured()) return stored(geo, "not_configured", {});
    const frames = [video.posterKey, ...(video.endPosterKey ? [video.endPosterKey] : [])];
    const verdicts: Record<string, PhotoVerdict> = {};
    for (const k of frames) if (known[k]) verdicts[k] = known[k] as PhotoVerdict;
    const missing = frames.filter((k) => !verdicts[k]);
    if (missing.length) {
      const checked = await checkPhotos(frames, missing);
      if (!checked) return stored(geo, "failed", verdicts);
      Object.assign(verdicts, checked);
    }
    const dry = frames.filter((k) => verdicts[k]?.flooded === "no");
    if (!dry.length) return stored({ ...geo, reason: `${geo.reason} AI checked the video's first and last frames for floodwater.` }, "ai", verdicts);
    const which = dry.length === 2 ? "Neither the start nor the end of the video shows" : dry[0] === video.posterKey ? "The start of the video does not show" : "The end of the video does not show";
    return stored({ result: "not_flooded", reason: `${which} floodwater (AI check), so the flood is shown as one pin instead of a stretch.` }, "ai", verdicts);
  } catch (err) {
    log.warn({ err }, "Video stretch analysis failed; the report stays one pin");
    return stored({ result: "one_spot", reason: "The video's locations could not be analyzed; shown as one pin." }, "failed", {});
  }
}
