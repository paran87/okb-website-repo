"use client";

import { useCallback, useEffect, useState } from "react";
import type { FeatureCollection } from "geojson";
import type { GeoJSONSource } from "maplibre-gl";
import { MapPin } from "lucide-react";
import { geoJsonService } from "@/features/map/services/geojson.service";
import { reloadOperationalLayers } from "@/features/map/services/map.service";
import { useMapStore } from "@/features/map/store/map.store";
import { cn } from "@/utils/cn";

const WEATHER_STATIONS_SOURCE_ID = "source-weather-stations";
const WEATHER_STATIONS_DATA_KEY = "weather-stations" as const;

interface WeatherCitiesResponse {
  success: boolean;
  data: FeatureCollection;
  meta?: { cityCount?: number };
}

/** Refreshes city weather dots with live PAGASA regional conditions. */
export function WeatherCitiesOverlay() {
  const map = useMapStore((s) => s.map);
  const status = useMapStore((s) => s.status);
  const [cityGeoJson, setCityGeoJson] = useState<FeatureCollection | null>(null);
  const [cityCount, setCityCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const applyCityData = useCallback(
    (geojson: FeatureCollection) => {
      // Keep geoJsonService cache in sync so MapLayerRenderer re-sync cannot
      // wipe live city dots back to the static snapshot.
      geoJsonService.set(WEATHER_STATIONS_DATA_KEY, geojson);

      if (!map) return false;
      const source = map.getSource(WEATHER_STATIONS_SOURCE_ID);
      if (source && source.type === "geojson") {
        (source as GeoJSONSource).setData(geojson);
        return true;
      }
      return false;
    },
    [map],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);

      try {
        const res = await fetch("/api/weather/cities");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const payload = (await res.json()) as WeatherCitiesResponse;
        if (cancelled) return;
        if (!payload.success) throw new Error("City weather request failed");

        setCityGeoJson(payload.data);
        setCityCount(payload.meta?.cityCount ?? payload.data.features.length);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 10 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!cityGeoJson || !map || status !== "ready") return;

    let attempts = 0;
    const tryApply = () => {
      if (applyCityData(cityGeoJson)) return;
      attempts += 1;
      if (attempts < 20) window.setTimeout(tryApply, 150);
    };

    tryApply();
  }, [cityGeoJson, map, status, applyCityData]);

  useEffect(() => {
    if (!map || status !== "ready") return;

    const onStyleLoad = () => {
      void reloadOperationalLayers(map).then(() => {
        if (cityGeoJson) applyCityData(cityGeoJson);
      });
    };

    map.on("style.load", onStyleLoad);
    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [map, status, cityGeoJson, applyCityData]);

  if (status !== "ready") return null;

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-20">
      <div
        className={cn(
          "glass pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-panel",
          error
            ? "text-amber-700 dark:text-amber-300"
            : "text-foreground",
        )}
        aria-live="polite"
      >
        <MapPin className="size-4 shrink-0" aria-hidden />
        {loading
          ? "Updating cities…"
          : error
            ? `${cityCount ?? 149} cities (offline)`
            : `${cityCount ?? 149} cities`}
      </div>
    </div>
  );
}
