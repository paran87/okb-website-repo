import "server-only";

import type { FeatureCollection } from "geojson";
import PHILIPPINE_CITIES from "@/features/weather/data/philippine-cities.json";
import { buildCityWeatherGeoJson } from "@/features/weather/lib/build-city-weather-geojson";
import { getPagasaWeatherBulletin } from "@/features/weather/services/pagasa.service";
import type { PagasaIslandGroup } from "@/features/weather/types";

export interface PhilippineCity {
  psgcCode: string;
  name: string;
  region: string;
  pagasaRegion: string;
  islandGroup: PagasaIslandGroup;
  latitude: number;
  longitude: number;
}

/** All 149 Philippine cities with PSGC codes and coordinates. */
export const PHILIPPINE_CITY_CATALOG = PHILIPPINE_CITIES as PhilippineCity[];

/** GeoJSON FeatureCollection of all Philippine cities with PAGASA-style weather. */
export async function getPhilippineCitiesWeatherGeoJson(): Promise<FeatureCollection> {
  const bulletin = await getPagasaWeatherBulletin();
  return buildCityWeatherGeoJson(PHILIPPINE_CITY_CATALOG, bulletin.regions);
}
