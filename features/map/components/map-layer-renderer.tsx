"use client";

import { useEffect } from "react";
import { useMapStore } from "@/features/map/store/map.store";
import { layerService } from "@/features/map/services/layer.service";

/** Syncs Zustand layer registry state to MapLibre sources/layers. */
export function MapLayerRenderer() {
  const map = useMapStore((s) => s.map);
  const layers = useMapStore((s) => s.layers);
  const status = useMapStore((s) => s.status);

  useEffect(() => {
    if (!map || status !== "ready") return;

    let cancelled = false;

    async function sync() {
      for (const config of layers) {
        if (cancelled) return;
        await layerService.ensureSource(map!, config);
        layerService.ensureLayers(map!, config);
        layerService.applyVisibility(map!, config);
        layerService.applyOpacity(map!, config);
      }
      layerService.reorder(map!, layers);
    }

    void sync().catch((err) => {
      if (cancelled) return;
      console.error("Map layer sync failed:", err);
    });

    return () => {
      cancelled = true;
    };
  }, [map, layers, status]);

  return null;
}
