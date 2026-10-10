"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ApiSuccess } from "@/lib/api/response";
import { QUERY_STALE_TIME } from "@/lib/constants";
import { buildAreaIndex, placeAreas, type PlacedArea } from "@/features/floodwatch/lib/place-areas";
import type { FloodwatchArea } from "@/features/floodwatch/types";
import { loadRoads } from "@/features/road-network/lib/data";
import type { RoadFeature } from "@/features/road-network/types";

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

  const index = useMemo(() => (roads ? buildAreaIndex(roads) : null), [roads]);
  const placed = useMemo<PlacedArea[]>(
    () => (index && query.data ? placeAreas(index, query.data) : []),
    [index, query.data],
  );

  return { placed, total: query.data?.length ?? null, ready: Boolean(index && query.data), isError: query.isError };
}
