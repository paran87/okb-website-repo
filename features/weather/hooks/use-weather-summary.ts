"use client";

import { useQuery } from "@tanstack/react-query";
import type { PagasaNcrSummary } from "@/features/weather/types";
import type { ApiSuccess } from "@/lib/api/response";
import { QUERY_STALE_TIME } from "@/lib/constants";

export const WEATHER_SUMMARY_QUERY_KEY = ["weather", "summary"] as const;

async function fetchWeatherSummary(): Promise<PagasaNcrSummary> {
  const response = await fetch("/api/weather/summary", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load weather summary");
  }

  const body = (await response.json()) as ApiSuccess<PagasaNcrSummary>;
  return body.data;
}

/** Live Metro Manila weather snapshot from PAGASA. */
export function useWeatherSummary() {
  return useQuery({
    queryKey: WEATHER_SUMMARY_QUERY_KEY,
    queryFn: fetchWeatherSummary,
    staleTime: QUERY_STALE_TIME,
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
  });
}
