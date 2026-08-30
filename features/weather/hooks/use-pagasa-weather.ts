"use client";

import { useQuery } from "@tanstack/react-query";
import type { PagasaWeatherBulletinResponse } from "@/features/weather/types";
import type { ApiSuccess } from "@/lib/api/response";
import { QUERY_STALE_TIME } from "@/lib/constants";

export const PAGASA_WEATHER_QUERY_KEY = ["weather", "pagasa"] as const;

async function fetchPagasaWeather(): Promise<PagasaWeatherBulletinResponse> {
  const response = await fetch("/api/weather", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load PAGASA weather data");
  }

  const body = (await response.json()) as ApiSuccess<PagasaWeatherBulletinResponse>;
  return body.data;
}

/** Live PAGASA bulletin for the weather module and dashboard widgets. */
export function usePagasaWeather() {
  return useQuery({
    queryKey: PAGASA_WEATHER_QUERY_KEY,
    queryFn: fetchPagasaWeather,
    staleTime: QUERY_STALE_TIME,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: true,
  });
}
