"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import type { DashboardData } from "@/features/dashboard/types";
import { QUERY_STALE_TIME } from "@/lib/constants";

export const DASHBOARD_QUERY_KEY = ["dashboard", "operations"] as const;

/**
 * Fetches National Operations Center dashboard data.
 * Prepared for future realtime invalidation via WebSocket events.
 */
export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: () => dashboardService.getDashboardData(),
    staleTime: QUERY_STALE_TIME,
    refetchInterval: 60_000,
  });
}
