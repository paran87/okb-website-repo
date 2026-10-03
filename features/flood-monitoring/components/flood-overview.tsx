"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { BarChart3, Layers, Radio, Waves, X } from "lucide-react";
import { getNcrSummary } from "@/features/dashboard/lib/ncr-summary";
import { FloodwatchAreasOverlay } from "@/features/floodwatch/components/floodwatch-areas-overlay";
import { useFloodwatchSummary } from "@/features/floodwatch/hooks/use-floodwatch-summary";
import { InsightsPanel } from "@/features/flood-monitoring/components/insights-panel";
import { LayerToggleCard } from "@/features/flood-monitoring/components/layer-toggle-card";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { createFloodOverviewLayerRegistry } from "@/features/map/config/layer-registry";
import { layerService } from "@/features/map/services/layer.service";
import { selectLayers, useMapStore } from "@/features/map/store/map.store";
import { cn } from "@/utils/cn";

const MapEngine = dynamic(
  () =>
    import("@/features/map/components/map-engine").then((m) => ({
      default: m.MapEngine,
    })),
  { ssr: false },
);

const LAYERS = createFloodOverviewLayerRegistry();
const INCIDENT_LAYER = "ncr-incidents";
const AREA_LAYER = "floodwatch-areas";
const INCIDENT_COLOR = "#dc2626";
const AREA_COLOR = "#7c3aed";

/** Flood Monitoring overview — full-bleed map with floating, interactive summaries. */
export function FloodOverview() {
  const summary = useMemo(() => getNcrSummary(), []);
  const floodwatch = useFloodwatchSummary();
  const fw = floodwatch.data;
  const [insightsOpen, setInsightsOpen] = useState(false);

  const layers = useMapStore(selectLayers);
  const map = useMapStore((s) => s.map);
  const toggleLayerVisibility = useMapStore((s) => s.toggleLayerVisibility);

  const isVisible = (id: string) =>
    layers.find((l) => l.id === id)?.visible ?? true;

  const toggle = useCallback(
    (id: string) => {
      toggleLayerVisibility(id);
      if (!map) return;
      const config = useMapStore.getState().layers.find((l) => l.id === id);
      if (config) layerService.applyVisibility(map, config);
    },
    [map, toggleLayerVisibility],
  );

  return (
    <div className="relative h-full min-h-[560px] flex-1 overflow-hidden bg-muted/20">
      <MapEngine
        initialView={{ ...NCR_MAP_VIEW, zoom: 11 }}
        initialLayers={LAYERS}
        showSearch={false}
        showLayerPanel={false}
        showLegend={false}
        showBasemapSwitcher
        className="absolute inset-0 h-full w-full"
      />
      <FloodwatchAreasOverlay />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-2 sm:p-3 lg:max-w-[560px]">
        <header className="glass pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2 shadow-panel">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Waves className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight text-foreground">
                Flood Monitoring
              </h1>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                National Capital Region · live overview
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success sm:inline-flex">
              <Radio className="size-3 animate-pulse" aria-hidden />
              Live
            </span>
            <button
              type="button"
              onClick={() => setInsightsOpen((v) => !v)}
              aria-expanded={insightsOpen}
              className="inline-flex items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60 lg:hidden"
            >
              {insightsOpen ? (
                <X className="size-3.5" aria-hidden />
              ) : (
                <BarChart3 className="size-3.5" aria-hidden />
              )}
              Insights
            </button>
          </div>
        </header>

        <div className="flex gap-2">
          <LayerToggleCard
            label="Active incidents"
            value={summary.total.toLocaleString()}
            caption={`${summary.located} located · ${summary.needsReview} to review`}
            color={INCIDENT_COLOR}
            icon={Waves}
            visible={isVisible(INCIDENT_LAYER)}
            onToggle={() => toggle(INCIDENT_LAYER)}
            split={summary.total ? summary.located / summary.total : 0}
          />
          <LayerToggleCard
            label="Flood-prone areas"
            value={fw ? fw.totalAreas.toLocaleString() : "—"}
            caption={
              fw
                ? `${fw.byRegion.length} regions · ${fw.pendingLocationReviews} to review`
                : floodwatch.isError
                  ? "Floodwatch unavailable"
                  : "Loading Floodwatch…"
            }
            color={AREA_COLOR}
            icon={Layers}
            visible={isVisible(AREA_LAYER)}
            onToggle={() => toggle(AREA_LAYER)}
          />
        </div>

        {insightsOpen ? (
          <InsightsPanel
            byDeo={summary.byDeo}
            byRegion={fw?.byRegion ?? []}
            regionsLoading={floodwatch.isLoading}
            className="max-h-[48dvh] lg:hidden"
          />
        ) : null}
      </div>

      <InsightsPanel
        byDeo={summary.byDeo}
        byRegion={fw?.byRegion ?? []}
        regionsLoading={floodwatch.isLoading}
        className={cn(
          "absolute right-3 top-3 z-20 hidden max-h-[calc(100%-7rem)] w-72 lg:flex",
        )}
      />
    </div>
  );
}
