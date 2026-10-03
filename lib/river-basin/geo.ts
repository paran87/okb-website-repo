import type { Feature, FeatureCollection, MultiPolygon } from "geojson";
import facts from "@/lib/config/river-basin-facts.json";

export type BasinBounds = [number, number, number, number];

export type BasinFacts = {
  areaKm2: number;
  regions: string[];
  provinces: string[];
  municipalities: number | null;
  barangays: number | null;
  rivers: string[];
  bounds: BasinBounds;
  criticalWatersheds: { name: string; hectares: number }[];
};

const table = facts as unknown as Record<string, BasinFacts>;

/** Area, extent and critical watersheds for one basin. */
export function getBasinFacts(slug: string): BasinFacts | undefined {
  return table[slug];
}

type Ring = number[][];

function inRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Point-in-MultiPolygon test (holes respected). */
export function pointInBasin(
  lng: number,
  lat: number,
  geometry: MultiPolygon,
): boolean {
  return geometry.coordinates.some(([outer, ...holes]) => {
    if (!outer || !inRing(lng, lat, outer)) return false;
    return !holes.some((hole) => inRing(lng, lat, hole));
  });
}

let boundariesPromise: Promise<FeatureCollection<MultiPolygon>> | null = null;
let watershedsPromise: Promise<FeatureCollection<MultiPolygon>> | null = null;

function load(url: string): Promise<FeatureCollection<MultiPolygon>> {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<FeatureCollection<MultiPolygon>>;
  });
}

/** All 18 major basin outlines (simplified), cached for the session. */
export function loadBasinBoundaries() {
  boundariesPromise ??= load("/data/river-basins/boundaries.geojson").catch(
    (error: unknown) => {
      boundariesPromise = null;
      throw error;
    },
  );
  return boundariesPromise;
}

/** National critical watersheds, tagged with the basin they belong to. */
export function loadCriticalWatersheds() {
  watershedsPromise ??= load(
    "/data/river-basins/critical-watersheds.geojson",
  ).catch((error: unknown) => {
    watershedsPromise = null;
    throw error;
  });
  return watershedsPromise;
}

export function featuresForBasin(
  collection: FeatureCollection<MultiPolygon>,
  slug: string,
  key: "slug" | "basin" = "slug",
): Feature<MultiPolygon>[] {
  return collection.features.filter((f) => f.properties?.[key] === slug);
}
