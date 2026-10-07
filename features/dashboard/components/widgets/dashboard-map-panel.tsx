"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Position } from "geojson";
import { X } from "lucide-react";
import { MapEngine } from "@/features/map/components/map-engine";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { createFloodOverviewLayerRegistry } from "@/features/map/config/layer-registry";
import { FloodwatchAreasOverlay } from "@/features/floodwatch/components/floodwatch-areas-overlay";
import { FloodLayers } from "@/features/incident/components/flood-map";
import { positionsOf, type PlacedLocation } from "@/features/incident/hooks/use-flood-situation";
import type { FloodLineFeature, FloodPointFeature } from "@/features/incident/components/flood-map";
import { FLOOD_SEVERITY, SEVERITY_ORDER } from "@/features/incident/lib/flood-severity";
import { formatMeters, formatRelative } from "@/features/reports/lib/format";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";

/** Flood-prone areas (Floodwatch) stay as background; incidents come from the received reports. */
const DASHBOARD_LAYERS = createFloodOverviewLayerRegistry().filter((layer) => layer.id !== "ncr-incidents");

interface DashboardMapPanelProps {
  className?: string;
  placed: PlacedLocation[];
  lines: FloodLineFeature[];
  points: FloodPointFeature[];
  /** Report data and road network loaded. */
  ready: boolean;
}

/** Dashboard map: flooded roads from the received reports (as on the Incidents tab) over flood-prone areas. */
export function DashboardMapPanel({ className, placed, lines, points, ready }: DashboardMapPanelProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: number; positions: Position[] } | null>(null);
  const framed = useRef(false);

  useEffect(() => {
    if (framed.current || !ready) return;
    framed.current = true;
    const all = placed.flatMap(positionsOf);
    if (all.length) setFocus({ id: Date.now(), positions: all });
  }, [ready, placed]);

  const select = useCallback((key: string | null) => setSelected(key), []);
  const current = selected ? placed.find((p) => p.location.key === selected) ?? null : null;

  return (
    <div className={cn("relative isolate h-full min-h-[280px] overflow-hidden rounded-card border border-border", className)}>
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
      <FloodLayers lines={lines} points={points} selectedKey={selected} focus={focus} onSelect={select} />

      <ul
        className="glass pointer-events-none absolute left-3 top-12 z-20 space-y-1 rounded-lg px-2 py-1.5 text-[10px] font-medium text-foreground shadow-panel"
        aria-label="Map legend"
      >
        {SEVERITY_ORDER.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: FLOOD_SEVERITY[s].color }} aria-hidden />
            {s === "unmeasured" ? "Flooded, depth not given" : `${FLOOD_SEVERITY[s].label} · ${FLOOD_SEVERITY[s].range.split(" (")[0]}`}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#7c3aed]" aria-hidden />
          Flood-prone area
        </li>
      </ul>

      {ready && placed.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-2 bottom-10 z-20 flex justify-center">
          <span className="glass rounded-full px-3 py-1.5 text-[11px] font-semibold text-success shadow-panel">
            No flooded roads reported — normal conditions
          </span>
        </div>
      ) : null}

      {current ? (
        <div className="glass absolute inset-x-2 bottom-10 z-30 rounded-lg p-2.5 text-[11px] shadow-panel sm:left-auto sm:right-14 sm:w-72">
          <div className="flex items-start gap-2">
            <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: FLOOD_SEVERITY[current.location.severity].color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">
                {FLOOD_SEVERITY[current.location.severity].label}
                {current.location.heightM !== null ? ` · ${formatMeters(current.location.heightM)}` : ""}
                <span className="font-normal text-muted-foreground"> · {formatRelative(current.location.reportedAt)}</span>
              </p>
              <p className="break-words text-foreground">{current.location.label}</p>
              {current.location.roadStatus ? <p className="break-words text-muted-foreground">Road: {current.location.roadStatus}</p> : null}
              <Link href={ROUTES.incidents} className="mt-1 inline-flex min-h-10 items-center font-semibold text-primary hover:underline">
                Open in Incidents
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="-m-1 flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
