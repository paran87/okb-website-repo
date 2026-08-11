"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect } from "react";
import { Layers } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { MapProvider, useMapContext } from "@/features/map/context/map-context";
import { MapOverlay } from "@/features/map/components/map-overlay";
import { GisMapToolbar } from "@/features/map/components/map-toolbar";
import { GisMapControls } from "@/features/map/components/map-controls";
import { MapBasemapSwitcher } from "@/features/map/components/map-basemap-switcher";
import { MapStatusIndicator } from "@/features/map/components/map-status";
import { GisLegend } from "@/features/map/components/legend";
import { LayerPanel } from "@/features/map/components/layer-panel";
import { GisMapSearch } from "@/features/map/components/map-search";
import { MapPopupOverlay } from "@/features/map/components/map-popup-overlay";
import { useMapStore } from "@/features/map/store/map.store";
import type { LayerConfig, MapEngineOptions, MapStyleId } from "@/features/map/types";
import type { MapViewport } from "@/types/geo";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { cn } from "@/utils/cn";

const MapContainer = dynamic(
  () =>
    import("@/features/map/components/map-container").then((m) => ({
      default: m.MapContainer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] w-full items-center justify-center bg-muted/20">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
);

interface MapEngineProps extends MapEngineOptions {
  initialView?: MapViewport;
  initialStyleId?: MapStyleId;
  initialLayers?: LayerConfig[];
}

/** Applies a custom layer registry before the map container mounts. */
function MapLayerBootstrap({
  initialLayers,
}: {
  initialLayers?: LayerConfig[];
}) {
  useLayoutEffect(() => {
    if (initialLayers) {
      useMapStore.getState().setLayers(initialLayers);
    }
    return () => {
      useMapStore.getState().resetLayers();
    };
  }, [initialLayers]);

  return null;
}

/** Composed GIS engine — map canvas, controls, layers, search, legend, popup. */
export function MapEngine({
  className,
  initialView = NCR_MAP_VIEW,
  initialStyleId,
  initialLayers,
  interactive = true,
  showControls = true,
  showLayerPanel = true,
  showSearch = true,
  showLegend = true,
  showBasemapSwitcher = false,
  lockBasemap = false,
  resetViewPreset,
  maxBounds,
  basemapStyles,
  styleId,
}: MapEngineProps) {
  return (
    <MapProvider
      initialView={initialView}
      initialStyleId={initialStyleId ?? styleId}
      options={{
        interactive,
        showControls,
        showLayerPanel,
        showSearch,
        showLegend,
        showBasemapSwitcher,
        lockBasemap,
        resetViewPreset,
        maxBounds,
        basemapStyles,
        styleId,
        className,
      }}
    >
      <div className={cn("relative h-full w-full overflow-hidden", className)}>
        <MapLayerBootstrap initialLayers={initialLayers} />
        <MapContainer className="h-full w-full" />
        <MapEngineOverlays />
      </div>
    </MapProvider>
  );
}

function MapEngineOverlays() {
  const { options } = useMapContext();
  const isLayerPanelOpen = useMapStore((s) => s.isLayerPanelOpen);
  const setLayerPanelOpen = useMapStore((s) => s.setLayerPanelOpen);

  return (
    <MapOverlay>
      <div className="pointer-events-none absolute left-3 top-3 flex items-start gap-2">
        <MapStatusIndicator />
        {options.showSearch ? <GisMapSearch /> : null}
      </div>

      {options.showLayerPanel ? (
        <GisMapToolbar position="top-right">
          <IconButton
            icon={Layers}
            label="Toggle layer panel"
            variant="outline"
            size="sm"
            className="glass pointer-events-auto shadow-panel"
            onClick={() => setLayerPanelOpen(!isLayerPanelOpen)}
          />
        </GisMapToolbar>
      ) : null}

      {options.showLayerPanel && isLayerPanelOpen ? (
        <div className="pointer-events-auto absolute right-3 top-14 z-20">
          <LayerPanel />
        </div>
      ) : null}

      {options.showBasemapSwitcher ? (
        <div className="pointer-events-auto absolute bottom-3 left-3 z-20">
          <MapBasemapSwitcher styles={options.basemapStyles} />
        </div>
      ) : null}

      {options.showControls ? (
        <div
          className={cn(
            "pointer-events-none absolute bottom-3 z-20",
            options.showBasemapSwitcher ? "right-3" : "right-3",
          )}
        >
          <GisMapControls />
        </div>
      ) : null}

      {options.showLegend && !options.showBasemapSwitcher ? (
        <div className="pointer-events-auto absolute bottom-3 left-3">
          <GisLegend />
        </div>
      ) : null}

      {options.showLegend && options.showBasemapSwitcher ? (
        <div className="pointer-events-auto absolute bottom-3 left-44 z-10 max-w-[220px]">
          <GisLegend />
        </div>
      ) : null}

      <MapPopupOverlay />
    </MapOverlay>
  );
}
