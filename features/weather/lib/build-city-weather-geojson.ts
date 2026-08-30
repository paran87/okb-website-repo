import type { FeatureCollection } from "geojson";
import type {
  PagasaRegionalForecast,
  PagasaWeatherCondition,
} from "@/features/weather/types";

export interface CityWeatherInput {
  psgcCode: string;
  name: string;
  region: string;
  pagasaRegion: string;
  islandGroup: string;
  latitude: number;
  longitude: number;
}

const CONDITION_VARIANTS: Record<
  PagasaWeatherCondition,
  readonly PagasaWeatherCondition[]
> = {
  "monsoon-rain": ["monsoon-rain", "monsoon-rain", "rain", "rain-showers", "cloudy"],
  rain: ["rain", "rain", "rain-showers", "cloudy", "partly-cloudy"],
  "rain-showers": ["rain-showers", "rain-showers", "partly-cloudy", "cloudy", "rain"],
  thunderstorms: ["thunderstorms", "rain", "rain-showers", "cloudy"],
  cloudy: ["cloudy", "cloudy", "partly-cloudy", "rain-showers"],
  "partly-cloudy": ["partly-cloudy", "partly-cloudy", "sunny", "cloudy"],
  sunny: ["sunny", "sunny", "partly-cloudy", "partly-cloudy"],
};

const CONDITION_LABELS: Record<PagasaWeatherCondition, string> = {
  sunny: "Fair / sunny",
  "partly-cloudy": "Partly cloudy",
  cloudy: "Cloudy",
  "rain-showers": "Rain showers",
  rain: "Rain",
  thunderstorms: "Thunderstorms",
  "monsoon-rain": "Monsoon rains",
};

/** Builds GeoJSON for Philippine cities colored by regional PAGASA conditions. */
export function buildCityWeatherGeoJson(
  cities: readonly CityWeatherInput[],
  regions: readonly PagasaRegionalForecast[] = [],
): FeatureCollection {
  const regionById = new Map(regions.map((region) => [region.id, region]));

  return {
    type: "FeatureCollection",
    features: cities.map((city) => {
      const forecast = regionById.get(city.pagasaRegion);
      const baseCondition = forecast?.condition ?? "partly-cloudy";
      const condition = cityCondition(baseCondition, city.psgcCode);
      const temperature = cityTemperature(
        forecast?.temperatureMin ?? 26,
        forecast?.temperatureMax ?? 32,
        city.psgcCode,
      );

      return {
        type: "Feature" as const,
        properties: {
          id: city.psgcCode,
          title: normalizeCityName(city.name),
          name: normalizeCityName(city.name),
          region: city.region,
          pagasaRegion: city.pagasaRegion,
          islandGroup: city.islandGroup,
          condition,
          conditionLabel: CONDITION_LABELS[condition],
          temperature,
          rainfall:
            forecast?.rainfallOutlook ?? "Isolated rain showers possible",
          wind: forecast?.wind ?? "Light to moderate",
          category: "weather",
        },
        geometry: {
          type: "Point" as const,
          coordinates: [city.longitude, city.latitude],
        },
      };
    }),
  };
}

function normalizeCityName(name: string): string {
  return name
    .replace(/^City of\s+/i, "")
    .replace(/\s+City$/i, "")
    .trim();
}

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function cityCondition(
  base: PagasaWeatherCondition,
  psgcCode: string,
): PagasaWeatherCondition {
  const variants = CONDITION_VARIANTS[base];
  return variants[hashCode(psgcCode) % variants.length] ?? base;
}

function cityTemperature(min: number, max: number, psgcCode: string): number {
  const spread = Math.max(max - min, 1);
  const offset = (hashCode(psgcCode) % 100) / 100;
  return Math.round(min + spread * offset);
}
