"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Feature, FeatureCollection, Point } from "geojson";
import { BarChart3, Route, SlidersHorizontal, X } from "lucide-react";
import type { ApiSuccess } from "@/lib/api/response";
import { cn } from "@/utils/cn";
import { floodProneService } from "@/features/flood-prone/services/flood-prone.service";
import type { Selection } from "@/features/road-network/components/road-map";
import {
  DetailsCard,
  FiltersPanel,
  InsightsPanel,
  type NearbyRisk,
} from "@/features/road-network/components/road-panels";
import { loadExpressways, loadRoads } from "@/features/road-network/lib/data";
import {
  computeStats,
  filterRoads,
  getFilterOptions,
  isFiltering,
  roadsToCsv,
} from "@/features/road-network/lib/filter";
import {
  boundsOf,
  distanceToLineMeters,
  type Bounds,
} from "@/features/road-network/lib/geo";
import {
  ALL,
  DEFAULT_FILTERS,
  type ExpresswayFeature,
  type RoadClass,
  type RoadFeature,
  type RoadFilters,
} from "@/features/road-network/types";

const RoadMap = dynamic(
  () =>
    import("@/features/road-network/components/road-map").then((m) => ({
      default: m.RoadMap,
    })),
  { ssr: false },
);

const NEARBY_METERS = 300;
const PHILIPPINES: Bounds = [116.9, 4.5, 126.7, 21];

type Sheet = "filters" | "insights" | null;

/** Road Network — national road explorer with filters, stats, and flood context. */
export function RoadNetworkView() {
  const [roads, setRoads] = useState<RoadFeature[]>([]);
  const [expressways, setExpressways] = useState<ExpresswayFeature[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [filters, setFilters] = useState<RoadFilters>(DEFAULT_FILTERS);
  const [showExpressways, setShowExpressways] = useState(true);
  const [showFlood, setShowFlood] = useState(false);
  const [showIncidents, setShowIncidents] = useState(false);
  const [selected, setSelected] = useState<Selection>(null);
  const [floodPoints, setFloodPoints] = useState<Feature<Point>[] | null>(null);
  const [fit, setFit] = useState<{ bounds: Bounds; key: number } | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadRoads(), loadExpressways()])
      .then(([r, e]) => {
        if (cancelled) return;
        setRoads(r);
        setExpressways(e);
        setLoadState("ready");
      })
      .catch(() => !cancelled && setLoadState("error"));
    return () => {
      cancelled = true;
    };
  }, []);

  // Flood-prone areas are fetched once, the first time they are needed.
  const needFlood = showFlood || selected !== null;
  useEffect(() => {
    if (!needFlood || floodPoints !== null) return;
    let cancelled = false;
    fetch("/api/floodwatch/areas")
      .then((res) =>
        res.ok
          ? (res.json() as Promise<ApiSuccess<FeatureCollection>>)
          : Promise.reject(new Error(String(res.status))),
      )
      .then(
        (body) =>
          !cancelled &&
          setFloodPoints(
            body.data.features.filter(
              (f): f is Feature<Point> => f.geometry.type === "Point",
            ),
          ),
      )
      .catch(() => !cancelled && setFloodPoints([]));
    return () => {
      cancelled = true;
    };
  }, [needFlood, floodPoints]);

  const incidentPoints = useMemo(
    () =>
      floodProneService
        .getGeoJson()
        .features.filter(
          (f): f is Feature<Point> => f.geometry.type === "Point",
        ),
    [],
  );

  const active = isFiltering(filters);
  const matches = useMemo(() => filterRoads(roads, filters), [roads, filters]);
  const matchIds = useMemo(
    () => (active ? matches.map((r) => r.properties.id) : null),
    [active, matches],
  );
  const stats = useMemo(() => computeStats(matches), [matches]);
  const nationalStats = useMemo(() => computeStats(roads), [roads]);
  const options = useMemo(
    () => getFilterOptions(roads, filters),
    [roads, filters],
  );
  const expresswayKm = useMemo(
    () => expressways.reduce((s, e) => s + e.properties.len, 0) / 1000,
    [expressways],
  );
  const expressFilter = useMemo(
    () => ({
      region: filters.region === ALL ? null : filters.region,
      island: filters.island === ALL ? null : filters.island,
    }),
    [filters.region, filters.island],
  );
  const scope =
    filters.region === ALL
      ? "region"
      : filters.province === ALL
        ? "province"
        : "deo";

  const selectedFeature = useMemo(() => {
    if (!selected) return null;
    const list: (RoadFeature | ExpresswayFeature)[] =
      selected.kind === "road" ? roads : expressways;
    return list.find((f) => f.properties.id === selected.id) ?? null;
  }, [selected, roads, expressways]);

  const nearby = useMemo<NearbyRisk>(() => {
    if (!selectedFeature) return { flood: null, incidents: null };
    const bounds = boundsOf([selectedFeature.geometry]);
    if (!bounds) return { flood: null, incidents: null };
    const pad = 0.006;
    const near = (point: Feature<Point>) => {
      const [lng, lat] = point.geometry.coordinates as [number, number];
      if (
        lng < bounds[0] - pad ||
        lng > bounds[2] + pad ||
        lat < bounds[1] - pad ||
        lat > bounds[3] + pad
      )
        return false;
      return (
        distanceToLineMeters(lng, lat, selectedFeature.geometry) <=
        NEARBY_METERS
      );
    };
    const flood = floodPoints ? floodPoints.filter(near) : null;
    return {
      flood: flood
        ? {
            count: flood.length,
            titles: flood
              .slice(0, 4)
              .map((f) => String(f.properties?.title ?? "Flood-prone area")),
          }
        : null,
      incidents: incidentPoints.filter(near).length,
    };
  }, [selectedFeature, floodPoints, incidentPoints]);

  // Frame the matches whenever the filters narrow the network (debounced for typing).
  useEffect(() => {
    if (loadState !== "ready") return;
    const timer = window.setTimeout(() => {
      const bounds = active
        ? boundsOf(matches.map((r) => r.geometry))
        : PHILIPPINES;
      if (bounds) setFit((prev) => ({ bounds, key: (prev?.key ?? 0) + 1 }));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [matches, active, loadState]);

  const change = useCallback(
    (next: Partial<RoadFilters>) => setFilters((f) => ({ ...f, ...next })),
    [],
  );
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const toggleClass = useCallback(
    (cls: RoadClass) =>
      setFilters((f) => ({
        ...f,
        classes: { ...f.classes, [cls]: !f.classes[cls] },
      })),
    [],
  );
  const pickScope = useCallback(
    (label: string) => {
      if (scope === "region")
        change({ region: label, province: ALL, deo: ALL });
      else if (scope === "province") change({ province: label, deo: ALL });
      else change({ deo: label });
    },
    [scope, change],
  );
  const pickRoad = useCallback((road: RoadFeature) => {
    setSelected({ kind: "road", id: road.properties.id });
    const bounds = boundsOf([road.geometry]);
    if (bounds) setFit((prev) => ({ bounds, key: (prev?.key ?? 0) + 1 }));
    setSheet(null);
  }, []);
  const exportCsv = useCallback(() => {
    const url = URL.createObjectURL(
      new Blob([roadsToCsv(matches)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "dpwh-road-sections.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [matches]);

  const filtersPanel = (
    <FiltersPanel
      filters={filters}
      options={options}
      stats={nationalStats}
      expresswayCount={expressways.length}
      expresswayKm={expresswayKm}
      showExpressways={showExpressways}
      showFlood={showFlood}
      showIncidents={showIncidents}
      floodCount={floodPoints ? floodPoints.length : null}
      active={active}
      onChange={change}
      onToggleClass={toggleClass}
      onToggleExpressways={() => setShowExpressways((v) => !v)}
      onToggleFlood={() => setShowFlood((v) => !v)}
      onToggleIncidents={() => setShowIncidents((v) => !v)}
      onReset={reset}
    />
  );
  const insightsPanel = (
    <InsightsPanel
      stats={stats}
      scope={scope}
      matches={matches}
      active={active}
      onPickScope={pickScope}
      onPickRoad={pickRoad}
      onExport={exportCsv}
      className="min-h-0 flex-1"
    />
  );
  const details =
    selected && selectedFeature ? (
      <DetailsCard
        feature={selectedFeature}
        kind={selected.kind}
        nearby={nearby}
        radius={NEARBY_METERS}
        onClose={() => setSelected(null)}
      />
    ) : null;

  return (
    <div className="bg-muted/20 relative h-full min-h-[560px] flex-1 overflow-hidden">
      {loadState === "ready" ? (
        <RoadMap
          roads={roads}
          expressways={expressways}
          matchIds={matchIds}
          showExpressways={showExpressways}
          expressFilter={expressFilter}
          floodPoints={floodPoints ?? []}
          incidentPoints={incidentPoints}
          showFlood={showFlood}
          showIncidents={showIncidents}
          selected={selected}
          selectedFeature={selectedFeature}
          fit={fit}
          onSelect={setSelected}
        />
      ) : (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
          {loadState === "error"
            ? "The road network could not be loaded."
            : "Loading road network…"}
        </div>
      )}

      {/* Desktop: filters on the left, selection + insights on the right. */}
      <div className="pointer-events-none absolute inset-0 z-20 hidden flex-col gap-2 p-3 lg:flex">
        <div className="flex min-h-0 flex-1 justify-between gap-3">
          <div className="flex min-h-0 w-80 flex-col gap-2 pt-9">
            <TitleCard
              sections={nationalStats.sections}
              km={nationalStats.km}
            />
            {filtersPanel}
          </div>
          <div className="flex min-h-0 w-80 flex-col gap-2 pb-[19.5rem]">
            {details ?? insightsPanel}
          </div>
        </div>
      </div>

      {/* Mobile / tablet: compact header with sheets. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-2 sm:p-3 lg:hidden">
        <div className="glass border-border/60 shadow-panel pointer-events-auto flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Route className="text-primary size-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <h1 className="text-foreground truncate text-sm leading-tight font-semibold">
                Road Network
              </h1>
              <p className="text-muted-foreground truncate text-[11px] leading-tight">
                {stats.sections.toLocaleString()} sections ·{" "}
                {Math.round(stats.km).toLocaleString()} km
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <SheetButton
              active={sheet === "filters"}
              onClick={() => setSheet(sheet === "filters" ? null : "filters")}
              icon={<SlidersHorizontal className="size-3.5" aria-hidden />}
              label="Filters"
            />
            <SheetButton
              active={sheet === "insights"}
              onClick={() => setSheet(sheet === "insights" ? null : "insights")}
              icon={<BarChart3 className="size-3.5" aria-hidden />}
              label="Insights"
            />
          </div>
        </div>
      </div>
      {sheet || details ? (
        <div className="[&_aside]:!bg-background [&_section]:!bg-background pointer-events-none absolute inset-x-0 bottom-0 z-30 flex max-h-[62%] flex-col gap-2 p-2 sm:p-3 lg:hidden">
          {sheet ? (
            <div className="pointer-events-auto relative flex min-h-0 flex-col">
              <button
                type="button"
                onClick={() => setSheet(null)}
                aria-label="Close panel"
                className="bg-background/80 text-muted-foreground absolute top-2 right-2 z-10 rounded-full p-1"
              >
                <X className="size-4" aria-hidden />
              </button>
              {sheet === "filters" ? filtersPanel : insightsPanel}
            </div>
          ) : (
            details
          )}
        </div>
      ) : null}
    </div>
  );
}

function TitleCard({ sections, km }: { sections: number; km: number }) {
  return (
    <header className="glass border-border/60 shadow-panel pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3 py-2">
      <span className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Route className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <h1 className="text-foreground truncate text-sm leading-tight font-semibold">
          Road Network
        </h1>
        <p className="text-muted-foreground truncate text-[11px] leading-tight">
          DPWH national roads · {sections.toLocaleString()} sections ·{" "}
          {Math.round(km).toLocaleString()} km
        </p>
      </div>
    </header>
  );
}

function SheetButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "border-border/60 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-muted/60",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
