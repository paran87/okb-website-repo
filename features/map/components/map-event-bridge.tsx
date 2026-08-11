"use client";

import { useCallback } from "react";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { useMapEvents } from "@/features/map/hooks/use-map-events";
import { useMapStore } from "@/features/map/store/map.store";
import { layerService } from "@/features/map/services/layer.service";
import { popupService } from "@/features/map/services/popup.service";

/** Bridges MapLibre interaction events to the GIS store. */
export function MapEventBridge() {
  const layers = useMapStore((s) => s.layers);
  const setCursorCoords = useMapStore((s) => s.setCursorCoords);
  const setPopup = useMapStore((s) => s.setPopup);
  const closePopup = useMapStore((s) => s.closePopup);
  const setSelection = useMapStore((s) => s.setSelection);

  const interactiveLayerIds = layerService.getInteractiveLayerIds(layers);

  const onClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const map = useMapStore.getState().map;
      if (!map) return;

      const features = map.queryRenderedFeatures(event.point, {
        layers: interactiveLayerIds,
      });
      const feature = features[0];
      if (!feature) {
        closePopup();
        return;
      }

      const id = String(feature.properties?.id ?? feature.id ?? "");
      if (id) setSelection({ selectedIds: [id] });

      setPopup(
        popupService.createState(
          feature,
          [event.lngLat.lng, event.lngLat.lat],
          { x: event.point.x, y: event.point.y },
        ),
      );
    },
    [closePopup, interactiveLayerIds, setPopup, setSelection],
  );

  const onMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      setCursorCoords([event.lngLat.lng, event.lngLat.lat]);
      const map = useMapStore.getState().map;
      if (!map) return;

      const features = map.queryRenderedFeatures(event.point, {
        layers: interactiveLayerIds,
      });
      map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";

      const hovered = features[0];
      setSelection({
        hoveredId: hovered
          ? String(hovered.properties?.id ?? hovered.id ?? "")
          : null,
      });
    },
    [interactiveLayerIds, setCursorCoords, setSelection],
  );

  useMapEvents({
    click: onClick,
    mousemove: onMouseMove,
  });

  return null;
}
