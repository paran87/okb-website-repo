"use client";

import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CollectorStatus,
  MediaListQuery,
  MediaListResult,
} from "@/features/media-collector/types";
import { api } from "@/features/reports/hooks/use-reports";

export const mediaKeys = {
  list: (q: MediaListQuery) => ["media-collector", "list", q] as const,
  status: ["media-collector", "status"] as const,
};

function params(q: MediaListQuery, offset: number): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q))
    if (v !== undefined && v !== "") p.set(k, String(v));
  if (offset) p.set("offset", String(offset));
  return p.toString();
}

/** Collected media, newest first, 24 per page ("Show more" loads the next page). */
export function useCollectedMedia(q: MediaListQuery) {
  return useInfiniteQuery({
    queryKey: mediaKeys.list(q),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (
        await api<MediaListResult>(
          `/api/media-collector?${params(q, pageParam)}`,
        )
      ).data,
    getNextPageParam: (last) =>
      last.total !== null &&
      last.offset + last.items.length < last.total &&
      last.items.length > 0
        ? last.offset + last.items.length
        : undefined,
    placeholderData: keepPreviousData,
    // New files appear without a reload: checked every minute while the page is open (and on focus).
    // Preview links are signed for 10 minutes, so refreshed pages always carry valid links.
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}

export function useCollectorStatus() {
  return useQuery({
    queryKey: mediaKeys.status,
    queryFn: async () =>
      (await api<CollectorStatus>("/api/media-collector/status")).data,
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useSetPaused() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: {
      whatsappPaused?: boolean;
      viberPaused?: boolean;
    }) =>
      (
        await api<CollectorStatus["settings"]>("/api/media-collector/status", {
          method: "PUT",
          body: JSON.stringify(patch),
        })
      ).data,
    onSuccess: (settings) => {
      qc.setQueryData<CollectorStatus>(mediaKeys.status, (prev) =>
        prev ? { ...prev, settings } : prev,
      );
    },
  });
}
