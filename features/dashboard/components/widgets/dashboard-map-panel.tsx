"use client";

import { MapEngine } from "@/features/map/components/map-engine";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { createFloodOverviewLayerRegistry } from "@/features/map/config/layer-registry";
import { FloodwatchAreasOverlay } from "@/features/floodwatch/components/floodwatch-areas-overlay";
import { cn } from "@/utils/cn";

const DASHBOARD_LAYERS = createFloodOverviewLayerRegistry();

interface DashboardMapPanelProps {
  className?: string;
}

/** Dashboard-embedded GIS map powered by the MapEngine. */
export function DashboardMapPanel({ className }: DashboardMapPanelProps) {
  return (
    <div
      className={cn(
        "relative isolate h-full min-h-[280px] overflow-hidden rounded-card border border-border",
        className,
      )}
    >
      <MapEngine
        initialView={NCR_MAP_VIEW}
        initialStyleId="light"
        initialLayers={DASHBOARD_LAYERS}
        lockBasemap
        showSearch={false}
        showLegend={false}
        showLayerPanel={false}
        className="h-full min-h-[280px] w-full lg:min-h-[360px] xl:min-h-0"
      />
      <FloodwatchAreasOverlay />
      <ul
        className="glass pointer-events-none absolute left-3 top-12 z-20 space-y-1 rounded-lg px-2 py-1.5 text-[10px] font-medium text-foreground shadow-panel"
        aria-label="Map legend"
      >
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#dc2626]" aria-hidden />
          Active incident
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#7c3aed]" aria-hidden />
          Flood-prone area
        </li>
      </ul>
    </div>
  );
}
