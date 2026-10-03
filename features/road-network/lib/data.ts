import type { FeatureCollection } from "geojson";
import type {
  ExpresswayFeature,
  RoadFeature,
} from "@/features/road-network/types";

let roadsPromise: Promise<RoadFeature[]> | null = null;
let expresswaysPromise: Promise<ExpresswayFeature[]> | null = null;

async function load<T>(url: string): Promise<T[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as FeatureCollection).features as unknown as T[];
}

/** National road sections (DPWH Road Classification), cached for the session. */
export function loadRoads(): Promise<RoadFeature[]> {
  roadsPromise ??= load<RoadFeature>("/data/road-network/roads.geojson").catch(
    (e) => {
      roadsPromise = null;
      throw e;
    },
  );
  return roadsPromise;
}

export function loadExpressways(): Promise<ExpresswayFeature[]> {
  expresswaysPromise ??= load<ExpresswayFeature>(
    "/data/road-network/expressways.geojson",
  ).catch((e) => {
    expresswaysPromise = null;
    throw e;
  });
  return expresswaysPromise;
}
