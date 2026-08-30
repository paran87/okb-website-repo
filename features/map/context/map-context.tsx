"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { MapEngineOptions, MapStyleId } from "@/features/map/types";
import type { MapViewport } from "@/types/geo";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { useMapStore } from "@/features/map/store/map.store";

export interface MapContextValue {
  options: MapEngineOptions;
  initialView: MapViewport;
  /** Undefined means "follow the active theme" rather than "use dark". */
  initialStyleId?: MapStyleId;
}

const MapContext = createContext<MapContextValue | null>(null);

interface MapProviderProps {
  children: ReactNode;
  initialView?: MapViewport;
  initialStyleId?: MapStyleId;
  options?: MapEngineOptions;
}

/** Provides map engine configuration to child components and hooks. */
export function MapProvider({
  children,
  initialView,
  initialStyleId,
  options = {},
}: MapProviderProps) {
  const resolvedStyleId = initialStyleId ?? options.styleId;

  const value = useMemo<MapContextValue>(
    () => ({
      options: {
        interactive: true,
        showControls: true,
        showLayerPanel: true,
        showSearch: true,
        showLegend: true,
        ...options,
      },
      initialView: initialView ?? NCR_MAP_VIEW,
      initialStyleId: resolvedStyleId,
    }),
    [initialView, resolvedStyleId, options],
  );

  return (
    <MapContext.Provider value={value}>{children}</MapContext.Provider>
  );
}

export function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error("useMapContext must be used within MapProvider");
  }
  return ctx;
}

export { useMapStore };
