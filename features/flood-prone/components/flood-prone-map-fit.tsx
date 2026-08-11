"use client";

import { useEffect } from "react";
import type { FeatureCollection } from "geojson";
import { useMapStore } from "@/features/map/store/map.store";
import { mapService } from "@/features/map/services/map.service";
import { floodProneService } from "@/features/flood-prone/services/flood-prone.service";

/** Fits the map to all DEOS flood-prone markers once the engine is ready. */
export function FloodProneMapFit() {
  const status = useMapStore((s) => s.status);
  const map = useMapStore((s) => s.map);

  useEffect(() => {
    if (status !== "ready" || !map) return;
    mapService.fitToFeatureCollection(
      map,
      floodProneService.getGeoJson(),
      { padding: 72, maxZoom: 12 },
    );
  }, [status, map]);

  return null;
}

export function getFloodProneMarkerCount(): number {
  return floodProneService.getGeoJson().features.length;
}

export type { FeatureCollection };
