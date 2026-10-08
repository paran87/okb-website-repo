"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OperationsMediaKind, OperationsSectionId } from "@/features/operations/config";
import type { OperationsMediaList } from "@/features/operations/types";

export class OperationsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason: string | null,
  ) {
    super(message);
    this.name = "OperationsApiError";
  }
}

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
    throw new OperationsApiError("Unable to reach the server. Check your connection.", 0, "network");
  }
  const body = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !body?.success || body.data === undefined) {
    throw new OperationsApiError(
      body?.error?.message ?? "The request failed.",
      res.status,
      body?.error?.details?.reason ?? null,
    );
  }
  return body.data;
}

export const operationsKeys = {
  all: ["operations-media"] as const,
  list: (section: OperationsSectionId, kind: OperationsMediaKind) => ["operations-media", section, kind] as const,
};

export function useOperationsMedia(section: OperationsSectionId, kind: OperationsMediaKind) {
  return useQuery({
    queryKey: operationsKeys.list(section, kind),
    queryFn: () => api<OperationsMediaList>(`/api/operations/media?section=${section}&kind=${kind}`),
    // File links are signed for 6 hours; refresh well before they lapse.
    staleTime: 5 * 60_000,
    refetchInterval: 60 * 60_000,
    retry: 1,
  });
}

export function useDeleteOperationsMedia(section: OperationsSectionId, kind: OperationsMediaKind) {
  const qc = useQueryClient();
  const queryKey = operationsKeys.list(section, kind);
  return useMutation({
    mutationFn: (key: string) =>
      api<{ deleted: string }>("/api/operations/media", {
        method: "DELETE",
        body: JSON.stringify({ section, key }),
      }),
    onSuccess: (_data, key) => {
      qc.setQueryData<OperationsMediaList>(queryKey, (prev) =>
        prev ? { ...prev, items: prev.items.filter((i) => i.key !== key) } : prev,
      );
    },
  });
}
