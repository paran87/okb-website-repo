"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReportsApiError } from "@/features/reports/hooks/use-reports";
import type {
  ConsolidatedReport,
  ConsolidatedSettings,
  ConsolidatedSettingsInput,
  ScheduleEntry,
  ScheduleInput,
  TestPeriod,
} from "@/features/consolidated-reports/types";

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string; details?: { reason?: string } };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    });
  } catch {
    throw new ReportsApiError("The Command Center could not be reached. Check your connection.", 0, "network");
  }
  let body: Envelope<T> | null = null;
  try {
    body = (await res.json()) as Envelope<T>;
  } catch {
    /* non-JSON */
  }
  if (!res.ok || !body?.success) {
    throw new ReportsApiError(body?.error?.message ?? "The request failed.", res.status, body?.error?.details?.reason ?? null);
  }
  return body.data as T;
}

export const consolidatedKeys = {
  settings: ["consolidated-reports", "settings"] as const,
  history: ["consolidated-reports", "history"] as const,
  schedules: ["consolidated-reports", "schedules"] as const,
};

/** A change to a report or to the schedule shows in both lists. */
const invalidateReports = (qc: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: consolidatedKeys.history }),
    qc.invalidateQueries({ queryKey: consolidatedKeys.schedules }),
  ]);

const retry = (count: number, error: Error) =>
  !(error instanceof ReportsApiError && [400, 401, 403, 404, 409, 422, 503].includes(error.status)) && count < 1;

export function useConsolidatedSettings() {
  return useQuery({
    queryKey: consolidatedKeys.settings,
    queryFn: () => api<ConsolidatedSettings>("/api/reports/consolidated/settings"),
    retry,
  });
}

export function useSaveConsolidatedSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsolidatedSettingsInput) =>
      api<ConsolidatedSettings>("/api/reports/consolidated/settings", { method: "PUT", body: JSON.stringify(input) }),
    onSuccess: (data) => qc.setQueryData(consolidatedKeys.settings, data),
  });
}

export function useConsolidatedHistory(enabled = true) {
  return useQuery({
    queryKey: consolidatedKeys.history,
    queryFn: () => api<ConsolidatedReport[]>("/api/reports/consolidated"),
    refetchInterval: 60_000,
    enabled,
    retry,
  });
}

export function useTestSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (period: TestPeriod = {}) =>
      api<ConsolidatedReport>("/api/reports/consolidated/test", { method: "POST", body: JSON.stringify(period) }),
    onSuccess: () => invalidateReports(qc),
  });
}

export function useResend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<ConsolidatedReport>(`/api/reports/consolidated/${encodeURIComponent(id)}/resend`, { method: "POST", body: "{}" }),
    onSuccess: () => invalidateReports(qc),
  });
}

export function useRetryText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<ConsolidatedReport>(`/api/reports/consolidated/${encodeURIComponent(id)}/text-retry`, { method: "POST", body: "{}" }),
    onSuccess: () => invalidateReports(qc),
  });
}

export function useCancelText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<ConsolidatedReport>(`/api/reports/consolidated/${encodeURIComponent(id)}/text-cancel`, { method: "POST", body: "{}" }),
    onSuccess: () => invalidateReports(qc),
  });
}

export function useSchedules(enabled = true) {
  return useQuery({
    queryKey: consolidatedKeys.schedules,
    queryFn: () => api<ScheduleEntry[]>("/api/reports/consolidated/schedules"),
    refetchInterval: 60_000,
    enabled,
    retry,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ScheduleInput) =>
      api<ScheduleEntry>("/api/reports/consolidated/schedules", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => invalidateReports(qc),
  });
}

export function useUpdateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ScheduleInput }) =>
      api<ScheduleEntry>(`/api/reports/consolidated/schedules/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateReports(qc),
  });
}

export function useDeleteSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ id: string; deleted: boolean }>(`/api/reports/consolidated/schedules/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateReports(qc),
  });
}

export function useDeleteReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ id: string; deleted: boolean }>(`/api/reports/consolidated/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => invalidateReports(qc),
  });
}
