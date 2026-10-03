"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiSuccess } from "@/lib/api/response";
import type { FloodwatchSummary } from "@/features/floodwatch/types";
import { QUERY_STALE_TIME } from "@/lib/constants";

/** Flood Prone Areas tab totals, proxied through our API. */
export function useFloodwatchSummary() {
  return useQuery<FloodwatchSummary>({
    queryKey: ["floodwatch", "summary"],
    queryFn: async () => {
      const res = await fetch("/api/floodwatch/dashboard");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return ((await res.json()) as ApiSuccess<FloodwatchSummary>).data;
    },
    staleTime: QUERY_STALE_TIME,
  });
}
