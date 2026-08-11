import type { DashboardData } from "@/features/dashboard/types";
import {
  MOCK_DASHBOARD_DATA,
  MOCK_DASHBOARD_LATENCY_MS,
} from "@/features/dashboard/services/mock-data";

/**
 * Dashboard data service. Returns mock operational data today; swap the
 * implementation for live API / WebSocket feeds in the realtime phase.
 */
export const dashboardService = {
  async getDashboardData(): Promise<DashboardData> {
    await delay(MOCK_DASHBOARD_LATENCY_MS);
    return {
      ...MOCK_DASHBOARD_DATA,
      lastUpdated: new Date().toISOString(),
    };
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
