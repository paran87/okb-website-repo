import type { FeatureCollection } from "geojson";
import {
  MOCK_GEOJSON_REGISTRY,
  type MockGeoJsonRegistryKey,
} from "@/features/map/data/mock";

const cache = new Map<string, FeatureCollection>();

/** Loads and caches mock GeoJSON datasets. Future: swap for API fetches. */
export const geoJsonService = {
  async get(key: MockGeoJsonRegistryKey): Promise<FeatureCollection> {
    const cached = cache.get(key);
    if (cached) return cached;

    const data = MOCK_GEOJSON_REGISTRY[key];
    cache.set(key, structuredClone(data));
    return data;
  },

  async getAll(
    keys: readonly MockGeoJsonRegistryKey[],
  ): Promise<Record<string, FeatureCollection>> {
    const entries = await Promise.all(
      keys.map(async (key) => [key, await this.get(key)] as const),
    );
    return Object.fromEntries(entries);
  },

  clearCache(): void {
    cache.clear();
  },
};
