import type { FeatureCollection } from "geojson";
import PHILIPPINE_CITIES from "@/features/weather/data/philippine-cities.json";
import { PAGASA_WEATHER_BULLETIN } from "@/features/weather/data/mock-pagasa-weather";
import { buildCityWeatherGeoJson } from "@/features/weather/lib/build-city-weather-geojson";

/** Active weather advisory areas — Philippines only (mock PAGASA-style). */
export const MOCK_WEATHER_ADVISORY_ZONES: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "waz-ncr",
        title: "Heavy Rainfall Warning — Metro Manila & Rizal",
        advisoryLevel: "warning",
        advisoryType: "Heavy Rainfall Warning",
        region: "National Capital Region",
        validUntil: "8:00 PM PHT today",
        category: "weather",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [120.88, 14.35],
            [121.25, 14.35],
            [121.25, 14.82],
            [120.88, 14.82],
            [120.88, 14.35],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "waz-thunder",
        title: "Thunderstorm Advisory No. 7",
        advisoryLevel: "alert",
        advisoryType: "Thunderstorm Advisory",
        region: "Eastern Metro Manila",
        validUntil: "5:30 PM PHT today",
        category: "weather",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [121.02, 14.55],
            [121.12, 14.55],
            [121.12, 14.68],
            [121.02, 14.68],
            [121.02, 14.55],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "waz-pampanga",
        title: "General Flood Advisory — Pampanga River Basin",
        advisoryLevel: "watch",
        advisoryType: "General Flood Advisory",
        region: "Central Luzon",
        validUntil: "6:00 AM PHT tomorrow",
        category: "weather",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [120.4, 14.8],
            [121.1, 14.8],
            [121.1, 15.5],
            [120.4, 15.5],
            [120.4, 14.8],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "waz-monsoon-luzon",
        title: "Monsoon Rain — Western Luzon",
        advisoryLevel: "monsoon",
        advisoryType: "Southwest Monsoon",
        region: "Central Luzon & MIMAROPA",
        validUntil: "19 August 2026 (6:00 PM)",
        category: "weather",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [119.5, 13.5],
            [120.8, 13.5],
            [120.8, 16.2],
            [119.5, 16.2],
            [119.5, 13.5],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "waz-visayas",
        title: "Monsoon Rain — Western Visayas",
        advisoryLevel: "monsoon",
        advisoryType: "Southwest Monsoon",
        region: "Western Visayas",
        validUntil: "19 August 2026 (6:00 PM)",
        category: "weather",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [122.0, 9.8],
            [123.4, 9.8],
            [123.4, 11.8],
            [122.0, 11.8],
            [122.0, 9.8],
          ],
        ],
      },
    },
  ],
};

/**
 * All 149 Philippine cities as weather dots (colored by condition).
 * WeatherCitiesOverlay may refresh this with live PAGASA regional conditions.
 */
export const MOCK_WEATHER_STATIONS: FeatureCollection = buildCityWeatherGeoJson(
  PHILIPPINE_CITIES,
  PAGASA_WEATHER_BULLETIN.regions,
);
