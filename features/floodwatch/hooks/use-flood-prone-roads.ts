"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiSuccess } from "@/lib/api/response";
import { QUERY_STALE_TIME } from "@/lib/constants";
import { buildAreaIndex, placeAreas, type AreaIndex, type PlacedArea } from "@/features/floodwatch/lib/place-areas";
import type { FloodwatchArea } from "@/features/floodwatch/types";
import { loadRoads } from "@/features/road-network/lib/data";
import type { RoadFeature } from "@/features/road-network/types";

/*
 * Placing every area on the road network takes a noticeable moment on a phone (it blocks the page, the map
 * included). The road network and the area list are cached for the session, so the results are kept with
 * them: coming back to a page reuses them instead of placing everything again.
 */
const areaIndexes = new WeakMap<RoadFeature[], AreaIndex>();
const placedAreas = new WeakMap<AreaIndex, WeakMap<FloodwatchArea[], PlacedArea[]>>();
function areaIndexOf(roads: RoadFeature[]): AreaIndex {
  let index = areaIndexes.get(roads);
  if (!index) areaIndexes.set(roads, (index = buildAreaIndex(roads)));
  return index;
}
function placedOf(index: AreaIndex, areas: FloodwatchArea[]): PlacedArea[] {
  let byAreas = placedAreas.get(index);
  if (!byAreas) placedAreas.set(index, (byAreas = new WeakMap()));
  let placed = byAreas.get(areas);
  if (!placed) byAreas.set(areas, (placed = placeAreas(index, areas)));
  return placed;
}

/** Every Flood Prone Areas (Floodwatch) row, placed on the DPWH road network. */
export function useFloodProneRoads() {
  const query = useQuery<FloodwatchArea[]>({
    queryKey: ["floodwatch", "areas", "records"],
    queryFn: async () => {
      const res = await fetch("/api/floodwatch/areas/records");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return ((await res.json()) as ApiSuccess<FloodwatchArea[]>).data;
    },
    staleTime: QUERY_STALE_TIME,
  });

  const [roads, setRoads] = useState<RoadFeature[] | null>(null);
  useEffect(() => {
    let live = true;
    // Without the road network the areas cannot be drawn; the card still shows the Floodwatch total.
    loadRoads()
      .then((r) => live && setRoads(r))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const index = useMemo(() => (roads ? areaIndexOf(roads) : null), [roads]);
  const placed = useMemo<PlacedArea[]>(
    () => (index && query.data ? placedOf(index, query.data) : []),
    [index, query.data],
  );

  return { placed, total: query.data?.length ?? null, ready: Boolean(index && query.data), isError: query.isError };
}
