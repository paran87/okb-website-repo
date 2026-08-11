"use client";

import dynamic from "next/dynamic";
import { MapEngine } from "@/features/map/components/map-engine";
import { createFloodOverviewLayerRegistry } from "@/features/map/config/layer-registry";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";

const LazyMapEngine = dynamic(
  () => Promise.resolve({ default: MapEngine }),
  { ssr: false },
);

const FLOOD_OVERVIEW_LAYERS = createFloodOverviewLayerRegistry();

/** Full-viewport GIS workspace for flood monitoring overview. */
export function FloodMonitoringMap() {
  return (
    <LazyMapEngine
      initialView={{ ...NCR_MAP_VIEW, zoom: 11.5 }}
      initialLayers={FLOOD_OVERVIEW_LAYERS}
      className="h-[calc(100dvh-8rem)] min-h-[480px] w-full"
    />
  );
}
