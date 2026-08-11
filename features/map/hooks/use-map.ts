"use client";

import { useCallback } from "react";
import { useMapStore } from "@/features/map/store/map.store";
import { mapService } from "@/features/map/services/map.service";
import type { MapViewport } from "@/types/geo";

/** Access the MapLibre instance and viewport controls. */
export function useMap() {
  const map = useMapStore((s) => s.map);
  const status = useMapStore((s) => s.status);
  const error = useMapStore((s) => s.error);
  const viewport = useMapStore((s) => s.viewport);
  const styleId = useMapStore((s) => s.styleId);
  const scaleLabel = useMapStore((s) => s.scaleLabel);
  const setStyleId = useMapStore((s) => s.setStyleId);

  const flyTo = useCallback(
    (view: Partial<MapViewport>) => {
      if (!map) return;
      mapService.flyTo(map, view);
    },
    [map],
  );

  const resetView = useCallback(
    (preset: "national" | "ncr" | "philippines" = "ncr") => {
      if (!map) return;
      mapService.resetView(map, preset);
    },
    [map],
  );

  const setStyle = useCallback(
    (id: typeof styleId) => {
      if (!map) return;
      setStyleId(id);
      mapService.setStyle(map, id);
    },
    [map, setStyleId],
  );

  return {
    map,
    status,
    error,
    viewport,
    styleId,
    scaleLabel,
    isReady: status === "ready",
    flyTo,
    resetView,
    setStyle,
  };
}
