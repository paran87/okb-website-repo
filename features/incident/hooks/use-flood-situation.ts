"use client";

import { useEffect, useMemo, useState } from "react";
import type { Position } from "geojson";
import { loadRoads } from "@/features/road-network/lib/data";
import type { RoadFeature } from "@/features/road-network/types";
import { useFloodMap } from "@/features/incident/hooks/use-flood-map";
import { FLOOD_SEVERITY, SEVERITY_ORDER, type FloodSeverity } from "@/features/incident/lib/flood-severity";
import { buildRoadIndex, resolveLocation, type ResolvedLocation } from "@/features/incident/lib/road-match";
import type { FloodMapLocation } from "@/features/incident/types";
import type { FloodLineFeature, FloodPointFeature } from "@/features/incident/components/flood-map";

export const SEVERITY_RANK: Record<FloodSeverity, number> = { unmeasured: 0, low: 1, medium: 2, high: 3 };

export interface PlacedLocation {
  location: FloodMapLocation;
  resolved: ResolvedLocation;
}

function useRoads() {
  const [roads, setRoads] = useState<RoadFeature[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadRoads()
      .then((r) => live && setRoads(r))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return { roads, failed };
}

export function positionsOf(p: PlacedLocation): Position[] {
  return [...p.resolved.lines.flat(), ...(p.resolved.point ? [p.resolved.point] : [])];
}

/**
 * The current flood situation from the received reports (Incidents tab and Dashboard): flooded locations
 * placed on the road network, most severe first, as map features, with the weather that clears them.
 */
export function useFloodSituation() {
  const query = useFloodMap();
  const { roads, failed: roadsFailed } = useRoads();
  const index = useMemo(() => (roads ? buildRoadIndex(roads) : null), [roads]);
  const data = query.data;

  const placed = useMemo<PlacedLocation[]>(() => {
    if (!data || (!index && !roadsFailed)) return [];
    const unplaced: ResolvedLocation = { lines: [], point: null, matched: [], basis: "none", places: 0 };
    return data.locations
      .map((location) => ({ location, resolved: index ? resolveLocation(index, location) : unplaced }))
      .sort(
        (a, b) =>
          SEVERITY_RANK[b.location.severity] - SEVERITY_RANK[a.location.severity] ||
          Date.parse(b.location.reportedAt) - Date.parse(a.location.reportedAt),
      );
  }, [data, index, roadsFailed]);

  const lines = useMemo<FloodLineFeature[]>(
    () =>
      placed
        .filter((p) => p.resolved.lines.length)
        .map((p) => ({
          type: "Feature",
          geometry: { type: "MultiLineString", coordinates: p.resolved.lines },
          properties: { key: p.location.key, color: FLOOD_SEVERITY[p.location.severity].color, rank: SEVERITY_RANK[p.location.severity] },
        })),
    [placed],
  );

  const points = useMemo<FloodPointFeature[]>(
    () =>
      placed
        .filter((p) => p.resolved.point && p.resolved.basis !== "road" && p.resolved.basis !== "none")
        .map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: p.resolved.point as Position },
          properties: { key: p.location.key, color: FLOOD_SEVERITY[p.location.severity].color, rank: SEVERITY_RANK[p.location.severity] },
        })),
    [placed],
  );

  const counts = useMemo(
    () => Object.fromEntries(SEVERITY_ORDER.map((s) => [s, placed.filter((p) => p.location.severity === s).length])) as Record<FloodSeverity, number>,
    [placed],
  );

  /** Ready to show: report data and the road network (or its failure) are in. */
  const ready = Boolean(data) && (Boolean(index) || roadsFailed);

  return { query, data, placed, lines, points, counts, ready, roadsReady: Boolean(index), roadsFailed };
}
