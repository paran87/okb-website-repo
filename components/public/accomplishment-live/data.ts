"use client";

import { useQuery } from "@tanstack/react-query";
import type { FieldPhoto, MapLine, PublicAccomplishment } from "@/features/accomplishment/public-types";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  const body = (await res.json().catch(() => null)) as { success?: boolean; data?: T; error?: { message?: string } } | null;
  if (!res.ok || !body?.success) throw new Error(body?.error?.message ?? "The accomplishment data could not be loaded.");
  return body.data as T;
}

const TEN_MINUTES = 10 * 60 * 1000;

export function useAccomplishment() {
  return useQuery({
    queryKey: ["okb-accomplishment-public"],
    queryFn: () => get<PublicAccomplishment>("/api/accomplishment/public"),
    staleTime: TEN_MINUTES,
    refetchInterval: TEN_MINUTES,
    retry: 2,
  });
}

export function useFieldPhotos(enabled: boolean) {
  return useQuery({
    queryKey: ["okb-accomplishment-photos"],
    queryFn: () => get<FieldPhoto[]>("/api/accomplishment/public/photos"),
    staleTime: TEN_MINUTES,
    enabled,
  });
}

export function useMapLines(enabled: boolean) {
  return useQuery({
    queryKey: ["okb-accomplishment-map"],
    queryFn: () => get<MapLine[]>("/api/accomplishment/public/map"),
    staleTime: TEN_MINUTES,
    enabled,
  });
}
