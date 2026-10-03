import type { WeatherSummary } from "@/features/dashboard/types";

/** Fallback weather shown when the live PAGASA summary is unavailable. */
export const MOCK_WEATHER: WeatherSummary = {
  region: "Metro Manila (NCR)",
  temperature: 28,
  temperatureUnit: "°C",
  rainfall: 18.4,
  rainfallUnit: "mm/hr",
  windSpeed: 32,
  windUnit: "km/h",
  humidity: 87,
  stormStatus: "Tropical Depression — Enhanced Southwest Monsoon",
  stormTone: "warning",
  updatedAt: "14:35 PHT",
};

/** Simulated network latency for the dashboard service. */
export const MOCK_DASHBOARD_LATENCY_MS = 280;
