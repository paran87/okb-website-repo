"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateIncidentInput,
  IncidentRecord,
  LocationHistory,
  ReportAnalytics,
  ReportDataSource,
  ReportDetail,
  ReportFacets,
  ReportListQuery,
  ReportListResult,
  ReportsAccessState,
  ReviewAction,
  SituationSummary,
} from "@/features/reports/types";

/**
 * Client data adapter for the Reports module. The browser only talks to the
 * Command Center's own /api/reports/* routes; Supabase and the OKB Bridge are
 * reached server-side with credentials that never leave the server.
 */

export class ReportsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason: string | null,
  ) {
    super(message);
    this.name = "ReportsApiError";
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  meta?: { dataSource?: ReportDataSource; [k: string]: unknown };
  error?: { code: string; message: string; details?: { reason?: string } };
}

export async function api<T>(path: string, init?: RequestInit): Promise<{ data: T; dataSource: ReportDataSource | null }> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
  } catch {
    throw new ReportsApiError("Unable to retrieve reports. Check backend connection.", 0, "network");
  }
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    /* non-JSON */
  }
  if (!res.ok || !body?.success) {
    throw new ReportsApiError(
      body?.error?.message ?? "Unable to retrieve reports. Check backend connection.",
      res.status,
      body?.error?.details?.reason ?? null,
    );
  }
  return { data: body.data as T, dataSource: body.meta?.dataSource ?? null };
}

function toParams(query: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "" && v !== "all") params.set(k, String(v));
  }
  // "all" is meaningful for the date preset.
  if (query.datePreset === "all") params.set("datePreset", "all");
  return params.toString();
}

const retry = (count: number, error: Error): boolean =>
  !(error instanceof ReportsApiError && [401, 403, 404, 422, 503].includes(error.status)) && count < 1;

export const reportKeys = {
  all: ["reports"] as const,
  access: (area: "reports" | "settings") => ["reports", "access", area] as const,
  list: (q: ReportListQuery) => ["reports", "list", q] as const,
  facets: ["reports", "facets"] as const,
  detail: (id: string) => ["reports", "detail", id] as const,
  summary: (hours: number) => ["reports", "summary", hours] as const,
  analytics: ["reports", "analytics"] as const,
  history: (reportId: string, key: string) => ["reports", "history", reportId, key] as const,
  incidents: (page: number) => ["reports", "incidents", page] as const,
};

/** Operator access for [area]: only Settings asks for the access key. */
export function useReportsAccess(area: "reports" | "settings" = "reports") {
  return useQuery({
    queryKey: reportKeys.access(area),
    queryFn: async () => (await api<ReportsAccessState>(`/api/reports/access?area=${area}`)).data,
    staleTime: 60_000,
    retry,
  });
}

export function useGrantAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { accessKey: string; operatorName: string }) =>
      api<{ granted: boolean }>("/api/reports/access", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function useRevokeAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ granted: boolean }>("/api/reports/access", { method: "DELETE" }),
    onSuccess: () => qc.resetQueries({ queryKey: reportKeys.all }),
  });
}

export function useReportList(query: ReportListQuery, enabled = true) {
  return useQuery({
    queryKey: reportKeys.list(query),
    queryFn: async () => api<ReportListResult>(`/api/reports?${toParams({ ...query })}`),
    placeholderData: keepPreviousData,
    enabled,
    retry,
  });
}

export function useReportFacets(enabled = true) {
  return useQuery({
    queryKey: reportKeys.facets,
    queryFn: async () => (await api<ReportFacets>("/api/reports/facets")).data,
    staleTime: 5 * 60_000,
    enabled,
    retry,
  });
}

export function useReportDetail(id: string | null) {
  return useQuery({
    queryKey: reportKeys.detail(id ?? ""),
    queryFn: async () => api<ReportDetail>(`/api/reports/${encodeURIComponent(id ?? "")}`),
    enabled: Boolean(id),
    retry,
    // Keep polling while the AI is working on it.
    refetchInterval: (q) => {
      const status = q.state.data?.data.status;
      return status === "processing" || status === "received" ? 15_000 : false;
    },
  });
}

export function useSituationSummary(hours: number, enabled = true) {
  return useQuery({
    queryKey: reportKeys.summary(hours),
    queryFn: async () => api<SituationSummary>(`/api/reports/summary?hours=${hours}`),
    enabled,
    retry,
    refetchInterval: 60_000,
  });
}

export function useReportAnalytics(enabled = true) {
  return useQuery({
    queryKey: reportKeys.analytics,
    queryFn: async () => api<ReportAnalytics>("/api/reports/analytics"),
    enabled,
    retry,
  });
}

export function useLocationHistory(reportId: string, key: string | null) {
  return useQuery({
    queryKey: reportKeys.history(reportId, key ?? ""),
    queryFn: async () =>
      (await api<LocationHistory>(`/api/reports/location-history?${toParams({ reportId, key })}`)).data,
    enabled: Boolean(key),
    retry,
  });
}

/** Polls for reports received after `since`; cheap count query, paused when the tab is hidden. */
export function useNewReportsCount(since: string | null, enabled = true) {
  return useQuery({
    queryKey: ["reports", "updates", since],
    queryFn: async () => (await api<{ count: number }>(`/api/reports/updates?since=${encodeURIComponent(since ?? "")}`)).data,
    enabled: enabled && Boolean(since),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
}

export function useReviewReport(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { action: ReviewAction; notes?: string | null }) =>
      api<ReportDetail>(`/api/reports/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export function useCreateIncident(reportId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIncidentInput) =>
      api<IncidentRecord>(`/api/reports/${encodeURIComponent(reportId)}/incidents`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: reportKeys.all }),
  });
}

export interface IncidentListResult {
  storage: "ready" | "not_configured";
  items: IncidentRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useIncidents(page: number, enabled = true) {
  return useQuery({
    queryKey: reportKeys.incidents(page),
    queryFn: async () => api<IncidentListResult>(`/api/incidents?page=${page}`),
    placeholderData: keepPreviousData,
    enabled,
    retry,
  });
}

export function useIncident(id: string | null) {
  return useQuery({
    queryKey: ["reports", "incident", id],
    queryFn: async () => (await api<IncidentRecord>(`/api/incidents/${encodeURIComponent(id ?? "")}`)).data,
    enabled: Boolean(id),
    retry,
  });
}
