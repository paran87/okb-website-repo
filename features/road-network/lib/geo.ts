import type { LineString, MultiLineString } from "geojson";

type Geometry = LineString | MultiLineString;
export type Bounds = [number, number, number, number];

function lines(geometry: Geometry): number[][][] {
  return geometry.type === "LineString"
    ? [geometry.coordinates]
    : geometry.coordinates;
}

/** [west, south, east, north] of one or more geometries. */
export function boundsOf(geometries: Geometry[]): Bounds | null {
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const geometry of geometries) {
    for (const line of lines(geometry)) {
      for (const [x, y] of line as [number, number][]) {
        if (x < w) w = x;
        if (x > e) e = x;
        if (y < s) s = y;
        if (y > n) n = y;
      }
    }
  }
  return Number.isFinite(w) ? [w, s, e, n] : null;
}

/** Shortest distance in meters from a point to a (multi)line (local planar approximation). */
export function distanceToLineMeters(
  lng: number,
  lat: number,
  geometry: Geometry,
): number {
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((lat * Math.PI) / 180);
  let best = Infinity;
  for (const line of lines(geometry)) {
    for (let i = 1; i < line.length; i += 1) {
      const [x1, y1] = line[i - 1] as [number, number];
      const [x2, y2] = line[i] as [number, number];
      const ax = (x1 - lng) * mPerDegLng;
      const ay = (y1 - lat) * mPerDegLat;
      const bx = (x2 - lng) * mPerDegLng;
      const by = (y2 - lat) * mPerDegLat;
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSq = dx * dx + dy * dy;
      const t =
        lengthSq === 0
          ? 0
          : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (d < best) best = d;
    }
  }
  return best;
}
