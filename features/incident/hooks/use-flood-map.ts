"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/features/reports/hooks/use-reports";
import type { FloodMapData } from "@/features/incident/types";

/** Flood map data, refreshed every minute (new reports and weather changes show up on their own). */
export function useFloodMap() {
  return useQuery({
    queryKey: ["reports", "flood-map"],
    queryFn: async () => (await api<FloodMapData>("/api/incidents/flood-map")).data,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
