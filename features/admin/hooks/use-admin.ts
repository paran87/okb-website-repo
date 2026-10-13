"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, jsonBody } from "@/features/admin/api";
import type {
  AdminMediaList,
  AdminState,
  MediaCollection,
  StorageCheck,
  StatsRange,
  VisitArea,
  VisitPage,
  VisitStats,
} from "@/features/admin/types";

export const adminKeys = {
  state: ["admin", "state"] as const,
  stats: (range: StatsRange, area: VisitArea | null) => ["admin", "stats", range, area] as const,
  visits: (range: StatsRange, area: VisitArea | null, q: string, page: number) =>
    ["admin", "visits", range, area, q, page] as const,
  collections: ["admin", "collections"] as const,
  media: (collection: string, view: "files" | "trash") => ["admin", "media", collection, view] as const,
  setup: ["admin", "setup"] as const,
  cors: ["admin", "cors"] as const,
};

function query(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") sp.set(k, String(v));
  return sp.toString();
}

export function useAdminState() {
  return useQuery({
    queryKey: adminKeys.state,
    queryFn: () => adminApi<AdminState>("/api/admin/session"),
    staleTime: 30_000,
  });
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; key: string }) =>
      adminApi<{ granted: boolean }>("/api/admin/session", { method: "POST", body: jsonBody(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi("/api/admin/session", { method: "DELETE" }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["admin"] });
      void qc.invalidateQueries({ queryKey: adminKeys.state });
    },
  });
}

export function useVisitStats(range: StatsRange, area: VisitArea | null, enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.stats(range, area),
    queryFn: () => adminApi<VisitStats>(`/api/admin/analytics?${query({ range, area })}`),
    enabled,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useVisits(range: StatsRange, area: VisitArea | null, q: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.visits(range, area, q, page),
    queryFn: () => adminApi<VisitPage>(`/api/admin/visits?${query({ range, area, q, page })}`),
    enabled,
    refetchInterval: page === 1 ? 30_000 : false,
    placeholderData: keepPreviousData,
  });
}

export function visitsExportUrl(range: StatsRange, area: VisitArea | null, q: string): string {
  return `/api/admin/visits/export?${query({ range, area, q })}`;
}

export function useCollections(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.collections,
    queryFn: () => adminApi<MediaCollection[]>("/api/admin/media"),
    enabled,
    staleTime: Infinity,
  });
}

export function useMedia(collection: string | null, view: "files" | "trash") {
  return useQuery({
    queryKey: adminKeys.media(collection ?? "", view),
    queryFn: () => adminApi<AdminMediaList>(`/api/admin/media?${query({ collection, view })}`),
    enabled: Boolean(collection),
  });
}

function useMediaMutation<T>(fn: (body: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin", "media"] }),
  });
}

export function useEditMedia() {
  return useMediaMutation(
    (body: { collection: string; key: string; title?: string | null; caption?: string | null; fileName?: string | null }) =>
      adminApi("/api/admin/media", { method: "PATCH", body: jsonBody(body) }),
  );
}

export function useDeleteMedia() {
  return useMediaMutation((body: { collection: string; key: string }) =>
    adminApi("/api/admin/media", { method: "DELETE", body: jsonBody(body) }),
  );
}

export function useRestoreMedia() {
  return useMediaMutation((body: { collection: string; key: string }) =>
    adminApi("/api/admin/media/trash", { method: "POST", body: jsonBody(body) }),
  );
}

export function usePurgeMedia() {
  return useMediaMutation((body: { collection: string; key: string }) =>
    adminApi("/api/admin/media/trash", { method: "DELETE", body: jsonBody(body) }),
  );
}

export function useSetupSql(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.setup,
    queryFn: () => adminApi<{ sql: string; sqlEditorUrl: string | null }>("/api/admin/setup"),
    enabled,
    staleTime: Infinity,
  });
}

export function useDirectUploads(enabled: boolean) {
  return useQuery({
    queryKey: adminKeys.cors,
    queryFn: () => adminApi<{ origin: string; status: "enabled" | "disabled" | "unknown" }>("/api/admin/media/cors"),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useEnableDirectUploads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi<{ origin: string; status: "enabled" }>("/api/admin/media/cors", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.cors }),
  });
}

export function useStorageCheck() {
  return useMutation({
    mutationFn: () => adminApi<StorageCheck>("/api/admin/storage-check", { method: "POST" }),
  });
}
