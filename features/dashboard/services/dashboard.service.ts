import type { DashboardData, WeatherSummary } from "@/features/dashboard/types";
import type { PagasaNcrSummary } from "@/features/weather/types";
import type { ApiSuccess } from "@/lib/api/response";
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

    let weather = MOCK_DASHBOARD_DATA.weather;
    try {
      const response = await fetch("/api/weather/summary", { cache: "no-store" });
      if (response.ok) {
        const body = (await response.json()) as ApiSuccess<PagasaNcrSummary>;
        weather = mapPagasaSummaryToWeather(body.data);
      }
    } catch {
      // Keep mock weather if the live feed is unavailable.
    }

    return {
      ...MOCK_DASHBOARD_DATA,
      weather,
      lastUpdated: new Date().toISOString(),
    };
  },
};

function mapPagasaSummaryToWeather(summary: PagasaNcrSummary): WeatherSummary {
  return {
    region: summary.region,
    temperature: summary.temperature,
    temperatureUnit: summary.temperatureUnit,
    rainfall: summary.rainfall,
    rainfallUnit: summary.rainfallUnit,
    windSpeed: summary.windSpeed,
    windUnit: summary.windUnit,
    humidity: summary.humidity,
    stormStatus: summary.stormStatus,
    stormTone: summary.stormTone,
    updatedAt: summary.updatedAt,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
