"use client";

import { useCallback } from "react";
import { useMapStore, selectLayers } from "@/features/map/store/map.store";
import { layerService } from "@/features/map/services/layer.service";
import { useMap } from "@/features/map/hooks/use-map";

/** Layer registry visibility, opacity, and legend access. */
export function useLayer() {
  const layers = useMapStore(selectLayers);
  const toggleLayerVisibility = useMapStore((s) => s.toggleLayerVisibility);
  const setLayerOpacity = useMapStore((s) => s.setLayerOpacity);
  const { map } = useMap();

  const applyToMap = useCallback(
    (layerId: string) => {
      if (!map) return;
      const config = layers.find((l) => l.id === layerId);
      if (!config) return;
      layerService.applyVisibility(map, config);
      layerService.applyOpacity(map, config);
    },
    [map, layers],
  );

  const toggle = useCallback(
    (layerId: string) => {
      toggleLayerVisibility(layerId);
      applyToMap(layerId);
    },
    [toggleLayerVisibility, applyToMap],
  );

  const setOpacity = useCallback(
    (layerId: string, opacity: number) => {
      setLayerOpacity(layerId, opacity);
      applyToMap(layerId);
    },
    [setLayerOpacity, applyToMap],
  );

  const legend = layerService.collectLegend(layers);

  return { layers, legend, toggle, setOpacity };
}
