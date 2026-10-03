"use client";

import { useEffect } from "react";
import type { FeatureCollection } from "geojson";
import type { GeoJSONSource } from "maplibre-gl";
import { geoJsonService } from "@/features/map/services/geojson.service";
import { useMapStore } from "@/features/map/store/map.store";
import type { ApiSuccess } from "@/lib/api/response";

const SOURCE_ID = "source-floodwatch-areas";
const DATA_KEY = "floodwatch-areas" as const;

/** Loads Flood Prone Areas (Floodwatch) points into the map layer. */
export function FloodwatchAreasOverlay() {
  const map = useMapStore((s) => s.map);
  const status = useMapStore((s) => s.status);

  useEffect(() => {
    if (!map || status !== "ready") return;
    let cancelled = false;
    let timer: number | undefined;

    async function load() {
      try {
        const res = await fetch("/api/floodwatch/areas");
        if (!res.ok) return;
        const geojson = ((await res.json()) as ApiSuccess<FeatureCollection>).data;
        if (cancelled) return;
        // Cache first so a layer re-sync cannot reset the points to empty.
        geoJsonService.set(DATA_KEY, geojson);

        let attempts = 0;
        const apply = () => {
          const source = map?.getSource(SOURCE_ID);
          if (source && source.type === "geojson") {
            (source as GeoJSONSource).setData(geojson);
            return;
          }
          attempts += 1;
          if (!cancelled && attempts < 20) timer = window.setTimeout(apply, 150);
        };
        apply();
      } catch {
        // Leave the layer empty if Floodwatch is unreachable.
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [map, status]);

  return null;
}
