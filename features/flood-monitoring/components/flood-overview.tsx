"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Position } from "geojson";
import { BarChart3, CloudRain, Layers, Radio, Waves, X } from "lucide-react";
import { FloodwatchAreasOverlay } from "@/features/floodwatch/components/floodwatch-areas-overlay";
import { useFloodwatchSummary } from "@/features/floodwatch/hooks/use-floodwatch-summary";
import { InsightsPanel, ncrAdvisories } from "@/features/flood-monitoring/components/insights-panel";
import { LayerToggleCard } from "@/features/flood-monitoring/components/layer-toggle-card";
import { FloodLayers } from "@/features/incident/components/flood-map";
import { FloodLocationCard } from "@/features/incident/components/flood-location-card";
import { positionsOf, useFloodSituation } from "@/features/incident/hooks/use-flood-situation";
import { FLOOD_SEVERITY, SEVERITY_ORDER } from "@/features/incident/lib/flood-severity";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { createFloodOverviewLayerRegistry } from "@/features/map/config/layer-registry";
import { layerService } from "@/features/map/services/layer.service";
import { selectLayers, useMapStore } from "@/features/map/store/map.store";
import { WeatherRadarOverlay } from "@/features/weather/components/weather-radar-overlay";
import { usePagasaWeather } from "@/features/weather/hooks/use-pagasa-weather";
import { cn } from "@/utils/cn";

const MapEngine = dynamic(
  () =>
    import("@/features/map/components/map-engine").then((m) => ({
      default: m.MapEngine,
    })),
  { ssr: false },
);

/** Flood-prone areas stay as reference; flooding comes from the received reports (no static incident list). */
const LAYERS = createFloodOverviewLayerRegistry().filter((layer) => layer.id !== "ncr-incidents");
const AREA_LAYER = "floodwatch-areas";
const AREA_COLOR = "#7c3aed";
const RAIN_COLOR = "#0284c7";
const NORMAL_COLOR = "#16a34a";

/**
 * Flood Monitoring overview — full-bleed map of the current situation: flooded roads from the received
 * reports (normal when none), PAGASA weather with the live rain radar, and flood-prone areas.
 */
export function FloodOverview() {
  const situation = useFloodSituation();
  const { placed, counts, ready, lines, points } = situation;
  const flood = situation.data;
  const weather = usePagasaWeather();
  const bulletin = weather.data;
  const ncr = bulletin?.ncrObservation;
  const floodwatch = useFloodwatchSummary();
  const fw = floodwatch.data;

  const [insightsOpen, setInsightsOpen] = useState(false);
  const [floodVisible, setFloodVisible] = useState(true);
  const [radarOn, setRadarOn] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: number; positions: Position[] } | null>(null);
  const framed = useRef(false);
  const radarAuto = useRef(false);

  const layers = useMapStore(selectLayers);
  const map = useMapStore((s) => s.map);
  const toggleLayerVisibility = useMapStore((s) => s.toggleLayerVisibility);

  const isVisible = (id: string) => layers.find((l) => l.id === id)?.visible ?? true;

  const toggle = useCallback(
    (id: string) => {
      toggleLayerVisibility(id);
      if (!map) return;
      const config = useMapStore.getState().layers.find((l) => l.id === id);
      if (config) layerService.applyVisibility(map, config);
    },
    [map, toggleLayerVisibility],
  );

  // Frame the flooded roads once they are known.
  useEffect(() => {
    if (framed.current || !ready) return;
    framed.current = true;
    const all = placed.flatMap(positionsOf);
    if (all.length) setFocus({ id: Date.now(), positions: all });
  }, [ready, placed]);

  // Rain radar on by itself while it rains or a warning is in effect (the operator can switch it off).
  useEffect(() => {
    if (radarAuto.current || !flood) return;
    radarAuto.current = true;
    if (flood.weather.state === "wet") setRadarOn(true);
  }, [flood]);

  const select = useCallback(
    (key: string | null) => {
      setSelected(key);
      const p = key ? placed.find((x) => x.location.key === key) : null;
      if (p) {
        setFloodVisible(true);
        setFocus({ id: Date.now(), positions: positionsOf(p) });
      }
    },
    [placed],
  );
  const current = selected ? (placed.find((p) => p.location.key === selected) ?? null) : null;

  const worst = SEVERITY_ORDER.find((s) => counts[s] > 0) ?? null;
  const floodColor = worst ? FLOOD_SEVERITY[worst].color : NORMAL_COLOR;
  const breakdown = SEVERITY_ORDER.filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${s === "unmeasured" ? "no depth" : FLOOD_SEVERITY[s].label.toLowerCase()}`)
    .join(" · ");
  const advisories = ncrAdvisories(bulletin?.advisories ?? []).length;

  const status = !ready
    ? { text: "Loading reports…", className: "bg-muted text-muted-foreground" }
    : placed.length
      ? { text: `Live · ${placed.length} flooded`, className: "bg-danger/15 text-danger" }
      : { text: "Live · Normal", className: "bg-success/15 text-success" };

  const insights = {
    placed,
    flood,
    ready,
    weather: bulletin,
    byRegion: fw?.byRegion ?? [],
    regionsLoading: floodwatch.isLoading,
    onSelect: (key: string) => {
      select(key);
      setInsightsOpen(false);
    },
  };

  return (
    <div className="relative h-full min-h-[560px] flex-1 overflow-hidden bg-muted/20">
      <MapEngine
        initialView={{ ...NCR_MAP_VIEW, zoom: 11 }}
        initialStyleId="light"
        lockBasemap
        initialLayers={LAYERS}
        showSearch={false}
        showLayerPanel={false}
        showLegend={false}
        showBasemapSwitcher
        showStatus={false}
        className="absolute inset-0 h-full w-full"
      />
      <FloodwatchAreasOverlay />
      <WeatherRadarOverlay enabled={radarOn} onEnabledChange={setRadarOn} hideButton />
      <FloodLayers lines={lines} points={points} selectedKey={selected} focus={focus} onSelect={select} visible={floodVisible} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-1.5 p-2 sm:gap-2 sm:p-3 lg:max-w-[600px]">
        <header className="glass pointer-events-auto flex items-center justify-between gap-2 rounded-xl border border-border/60 py-1 pl-2 pr-1 shadow-panel sm:gap-3 sm:px-3 sm:py-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span className="hidden size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary sm:flex">
              <Waves className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight text-foreground">Flood Monitoring</h1>
              <p className="truncate text-[11px] leading-tight text-muted-foreground">
                <span className="sm:hidden">NCR · now</span>
                <span className="hidden sm:inline">National Capital Region · current situation</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                status.className,
              )}
            >
              <Radio className="size-3 animate-pulse" aria-hidden />
              {status.text}
            </span>
            <button
              type="button"
              onClick={() => setInsightsOpen((v) => !v)}
              aria-expanded={insightsOpen}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border/60 px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60 lg:hidden"
            >
              {insightsOpen ? <X className="size-3.5" aria-hidden /> : <BarChart3 className="size-3.5" aria-hidden />}
              Details
            </button>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          <LayerToggleCard
            label="Flooded roads"
            value={ready ? placed.length.toLocaleString() : "—"}
            caption={!ready ? "Loading reports…" : placed.length ? breakdown : "Normal — no flood reports"}
            color={floodColor}
            icon={Waves}
            visible={floodVisible}
            onToggle={() => setFloodVisible((v) => !v)}
            className="min-w-0"
          />
          <LayerToggleCard
            label="Rain · PAGASA"
            value={ncr ? `${ncr.rainfall} mm/h` : "—"}
            caption={
              ncr
                ? `${ncr.condition}${advisories ? ` · ${advisories} NCR warning${advisories === 1 ? "" : "s"}` : ""}`
                : weather.isError
                  ? "PAGASA unavailable"
                  : "Loading PAGASA…"
            }
            color={RAIN_COLOR}
            icon={CloudRain}
            visible={radarOn}
            onToggle={() => setRadarOn((v) => !v)}
            className="min-w-0"
          />
          <LayerToggleCard
            label="Flood-prone areas"
            value={fw ? fw.totalAreas.toLocaleString() : "—"}
            caption={fw ? `${fw.byRegion.length} regions · Floodwatch` : floodwatch.isError ? "Floodwatch unavailable" : "Loading Floodwatch…"}
            color={AREA_COLOR}
            icon={Layers}
            visible={isVisible(AREA_LAYER)}
            onToggle={() => toggle(AREA_LAYER)}
            className="min-w-0"
          />
        </div>

        <ul
          aria-label="Map legend"
          className="glass pointer-events-none flex flex-wrap gap-x-2.5 gap-y-1 self-start rounded-lg px-2 py-1 text-[10px] font-medium text-foreground shadow-panel sm:gap-x-3 sm:self-auto sm:py-1.5"
        >
          {SEVERITY_ORDER.map((s) => (
            <li key={s} className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full sm:w-4" style={{ backgroundColor: FLOOD_SEVERITY[s].color }} aria-hidden />
              {/* Phones: the short name; the depth ranges from sm up. */}
              <span className="sm:hidden">{s === "unmeasured" ? "No depth" : FLOOD_SEVERITY[s].label}</span>
              <span className="hidden sm:inline">
                {s === "unmeasured" ? "Depth not given" : `${FLOOD_SEVERITY[s].label} · ${FLOOD_SEVERITY[s].range.split(" (")[0]}`}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-[#7c3aed] sm:size-2.5" aria-hidden />
            Flood-prone
          </li>
        </ul>

        {ready && placed.length === 0 ? (
          <p className="glass pointer-events-none self-start rounded-full px-3 py-1.5 text-[11px] font-semibold text-success shadow-panel">
            Normal — no flooded roads in the received reports
          </p>
        ) : null}

        {insightsOpen ? <InsightsPanel {...insights} className="max-h-[52dvh] bg-card lg:hidden" /> : null}
      </div>

      <InsightsPanel {...insights} className="absolute right-3 top-3 z-20 hidden max-h-[calc(100%-7rem)] w-80 lg:flex" />



      {current ? (
        <FloodLocationCard
          location={current.location}
          onClose={() => setSelected(null)}
          className="absolute inset-x-2 bottom-2 z-40 sm:bottom-10 sm:left-auto sm:right-14 sm:w-72 lg:right-[22rem]"
        />
      ) : null}
    </div>
  );
}
