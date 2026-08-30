import type { LayerConfig } from "@/features/map/types";

/** Weather module layer registry — Philippine city weather dots. */
export function createWeatherLayerRegistry(): LayerConfig[] {
  return [
    {
      id: "weather-stations",
      sourceId: "source-weather-stations",
      label: "Philippine Cities",
      kind: "point",
      category: "weather",
      visible: true,
      opacity: 1,
      order: 20,
      dataKey: "weather-stations",
      layerIds: ["weather-stations-circle"],
      interactive: true,
      legend: [
        {
          id: "ws-sunny",
          label: "Fair / sunny",
          color: "#eab308",
          shape: "circle",
        },
        {
          id: "ws-partly",
          label: "Partly cloudy",
          color: "#84cc16",
          shape: "circle",
        },
        {
          id: "ws-cloudy",
          label: "Cloudy",
          color: "#64748b",
          shape: "circle",
        },
        {
          id: "ws-showers",
          label: "Rain showers",
          color: "#06b6d4",
          shape: "circle",
        },
        {
          id: "ws-rain",
          label: "Rain",
          color: "#2563eb",
          shape: "circle",
        },
        {
          id: "ws-thunder",
          label: "Thunderstorms",
          color: "#ea580c",
          shape: "circle",
        },
        {
          id: "ws-monsoon",
          label: "Monsoon rains",
          color: "#dc2626",
          shape: "circle",
        },
      ],
      metadata: {
        description: "All 149 Philippine cities with PAGASA regional weather conditions",
        featureCount: 149,
      },
    },
  ];
}
