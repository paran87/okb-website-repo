"use client";

import { useEffect, useRef } from "react";
import type { MapLayerMouseEvent, MapLibreEvent } from "maplibre-gl";
import { useMap } from "@/features/map/hooks/use-map";
import type { MapEventHandler, MapEventName } from "@/features/map/types";

type HandlerMap = {
  click?: MapEventHandler<MapLayerMouseEvent>;
  dblclick?: MapEventHandler<MapLayerMouseEvent>;
  contextmenu?: MapEventHandler<MapLayerMouseEvent>;
  mousemove?: MapEventHandler<MapLayerMouseEvent>;
  zoom?: MapEventHandler;
  move?: MapEventHandler;
  rotate?: MapEventHandler;
  pitch?: MapEventHandler;
  resize?: MapEventHandler;
  load?: MapEventHandler;
  idle?: MapEventHandler;
};

/** Subscribe to MapLibre events with automatic cleanup. */
export function useMapEvents(handlers: HandlerMap, enabled = true): void {
  const { map, isReady } = useMap();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!map || !isReady || !enabled) return;

    const entries = Object.entries(handlersRef.current) as [
      MapEventName,
      MapEventHandler | undefined,
    ][];

    for (const [event, handler] of entries) {
      if (!handler) continue;
      map.on(event, handler as (ev: MapLibreEvent) => void);
    }

    return () => {
      for (const [event, handler] of entries) {
        if (!handler) continue;
        map.off(event, handler as (ev: MapLibreEvent) => void);
      }
    };
  }, [map, isReady, enabled]);
}
