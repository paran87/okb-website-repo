"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiSuccess } from "@/lib/api/response";
import type {
  IdentifiedSegment,
  RiverResult,
  WaterwayStats,
} from "@/features/waterways/config";

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as ApiSuccess<T>).data;
}

/** Network totals, summaries and the named rivers (cached server-side for a day). */
export function useWaterwayStats() {
  return useQuery<WaterwayStats>({
    queryKey: ["waterways", "stats"],
    queryFn: () => get<WaterwayStats>("/api/waterways/stats"),
    staleTime: 60 * 60 * 1000,
  });
}

export type LegendEntries = Record<number, { label: string; image: string }[]>;

export function useHazardLegend(enabled: boolean) {
  return useQuery<LegendEntries>({
    queryKey: ["waterways", "legend"],
    queryFn: () => get<LegendEntries>("/api/waterways/legend"),
    staleTime: 24 * 60 * 60 * 1000,
    enabled,
  });
}

export const identifySegment = (lng: number, lat: number, zoom: number) =>
  get<IdentifiedSegment | null>(
    `/api/waterways/identify?lng=${lng}&lat=${lat}&z=${Math.round(zoom)}`,
  );

export const fetchRiverByName = (name: string) =>
  get<RiverResult>(`/api/waterways/river?name=${encodeURIComponent(name)}`);
