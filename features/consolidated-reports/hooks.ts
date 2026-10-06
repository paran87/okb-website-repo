"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReportsApiError } from "@/features/reports/hooks/use-reports";
import type {
  ConsolidatedReport,
  ConsolidatedSettings,
  ConsolidatedSettingsInput,
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
};

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
    mutationFn: () => api<ConsolidatedReport>("/api/reports/consolidated/test", { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: consolidatedKeys.history }),
  });
}

export function useResend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<ConsolidatedReport>(`/api/reports/consolidated/${encodeURIComponent(id)}/resend`, { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: consolidatedKeys.history }),
  });
}

export function useRetryText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<ConsolidatedReport>(`/api/reports/consolidated/${encodeURIComponent(id)}/text-retry`, { method: "POST", body: "{}" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: consolidatedKeys.history }),
  });
}
