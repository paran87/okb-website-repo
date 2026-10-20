"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchReports } from "../lib/api";

export const floodReportsKey = (hours: number) => ["flood-reports", "public", hours] as const;

/** Public map reports, refreshed every 30 s (new reports from other people appear on their own). */
export function useFloodReports(hours: number) {
  return useQuery({
    queryKey: floodReportsKey(hours),
    queryFn: () => fetchReports(hours),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}
