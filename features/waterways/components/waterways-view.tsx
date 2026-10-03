"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Feature,
  FeatureCollection,
  MultiLineString,
  Point,
} from "geojson";
import { BarChart3, SlidersHorizontal, Waves, X } from "lucide-react";
import type { ApiSuccess } from "@/lib/api/response";
import waterwayTiles from "@/lib/config/waterway-tiles.json";
import { cn } from "@/utils/cn";
import { floodProneService } from "@/features/flood-prone/services/flood-prone.service";
import {
  boundsOf,
  distanceToLineMeters,
} from "@/features/road-network/lib/geo";
import type { OverlayState } from "@/features/waterways/components/waterways-map";
import {
  DetailsCard,
  FiltersPanel,
  InsightsPanel,
} from "@/features/waterways/components/waterways-panels";
import {
  ALL_CLASSES,
  ALL_URBS,
  OVERLAYS,
  URBS,
  type DischargeClassId,
  type IdentifiedSegment,
  type LngLatBounds,
  type OverlayId,
  type RiverResult,
  type UrbCode,
} from "@/features/waterways/config";
import {
  fetchRiverByName,
  identifySegment,
  useHazardLegend,
  useWaterwayStats,
} from "@/features/waterways/lib/api";

const WaterwaysMap = dynamic(
  () =>
    import("@/features/waterways/components/waterways-map").then((m) => ({
      default: m.WaterwaysMap,
    })),
  { ssr: false },
);

const NEARBY_KM = 1;
const ALL_BOUNDS: LngLatBounds = [
  Math.min(...URBS.map((u) => u.bounds[0])),
  Math.min(...URBS.map((u) => u.bounds[1])),
  Math.max(...URBS.map((u) => u.bounds[2])),
  Math.max(...URBS.map((u) => u.bounds[3])),
];
const INITIAL_OVERLAYS = Object.fromEntries(
  OVERLAYS.map((o) => [o.id, { on: false, opacity: 0.7 }]),
) as Record<OverlayId, OverlayState>;

type Sheet = "filters" | "insights" | null;

/** Waterways: DENR INREMP river system explorer with flow filters and flood context. */
export function WaterwaysView() {
  const statsQuery = useWaterwayStats();
  const [urbs, setUrbs] = useState<UrbCode[]>(ALL_URBS);
  const [classes, setClasses] = useState<DischargeClassId[]>(ALL_CLASSES);
  const [overlays, setOverlays] = useState(INITIAL_OVERLAYS);
  const [showFlood, setShowFlood] = useState(false);
  const [showIncidents, setShowIncidents] = useState(false);
  const [segment, setSegment] = useState<IdentifiedSegment | null>(null);
  const [river, setRiver] = useState<RiverResult | null>(null);
  const [picking, setPicking] = useState(false);
  const [floodPoints, setFloodPoints] = useState<Feature<Point>[] | null>(null);
  const [fit, setFit] = useState<{ bounds: LngLatBounds; key: number } | null>({
    bounds: ALL_BOUNDS,
    key: 1,
  });
  const [sheet, setSheet] = useState<Sheet>(null);

  const legendQuery = useHazardLegend(
    overlays.flood.on || overlays.landslide.on,
  );
  const filtering =
    urbs.length < ALL_URBS.length || classes.length < ALL_CLASSES.length;

  const riverTilesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (urbs.length < ALL_URBS.length) params.set("u", urbs.join(","));
    if (classes.length < ALL_CLASSES.length) params.set("q", classes.join(","));
    const query = params.toString();
    return query ? `?${query.replace(/%2C/g, ",")}` : "";
  }, [urbs, classes]);

  const selected = segment ?? river;
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

  const geometry: MultiLineString | null =
    river?.geometry ?? segment?.geometry ?? null;
  const highlight = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: geometry ? [{ type: "Feature", properties: {}, geometry }] : [],
    }),
    [geometry],
  );

  const nearby = useMemo(() => {
    if (!geometry) return { flood: null as number | null, incidents: 0 };
    const bounds = boundsOf([geometry]);
    if (!bounds) return { flood: null, incidents: 0 };
    const pad = 0.012;
    const near = (point: Feature<Point>) => {
      const [lng, lat] = point.geometry.coordinates as [number, number];
      if (
        lng < bounds[0] - pad ||
        lng > bounds[2] + pad ||
        lat < bounds[1] - pad ||
        lat > bounds[3] + pad
      )
        return false;
      return distanceToLineMeters(lng, lat, geometry) <= NEARBY_KM * 1000;
    };
    return {
      flood: floodPoints ? floodPoints.filter(near).length : null,
      incidents: incidentPoints.filter(near).length,
    };
  }, [geometry, floodPoints, incidentPoints]);

  const zoomTo = useCallback(
    (bounds: LngLatBounds) =>
      setFit((prev) => ({ bounds, key: (prev?.key ?? 0) + 1 })),
    [],
  );

  const identify = useCallback(
    async (lng: number, lat: number, zoom: number) => {
      setPicking(true);
      try {
        const hit = await identifySegment(lng, lat, zoom);
        setRiver(null);
        setSegment(hit);
        if (hit) setSheet(null);
      } catch {
        setSegment(null);
      } finally {
        setPicking(false);
      }
    },
    [],
  );

  const pickRiver = useCallback(
    async (name: string) => {
      setPicking(true);
      try {
        const result = await fetchRiverByName(name);
        setSegment(null);
        setRiver(result);
        zoomTo(result.bounds);
        setSheet(null);
      } finally {
        setPicking(false);
      }
    },
    [zoomTo],
  );

  const toggleUrb = useCallback(
    (code: UrbCode) =>
      setUrbs((cur) =>
        cur.includes(code)
          ? cur.length > 1
            ? cur.filter((c) => c !== code)
            : cur
          : [...cur, code],
      ),
    [],
  );
  const toggleClass = useCallback(
    (id: DischargeClassId) =>
      setClasses((cur) =>
        cur.includes(id)
          ? cur.length > 1
            ? cur.filter((c) => c !== id)
            : cur
          : [...cur, id],
      ),
    [],
  );
  const zoomUrb = useCallback(
    (code: UrbCode) => {
      const basin = URBS.find((u) => u.code === code);
      if (basin) zoomTo(basin.bounds);
    },
    [zoomTo],
  );
  const clearSelection = useCallback(() => {
    setSegment(null);
    setRiver(null);
  }, []);
  const reset = useCallback(() => {
    setUrbs(ALL_URBS);
    setClasses(ALL_CLASSES);
  }, []);

  const stats = statsQuery.data;
  const filters = (
    <FiltersPanel
      stats={stats}
      urbs={urbs}
      classes={classes}
      overlays={overlays}
      legend={legendQuery.data}
      showFlood={showFlood}
      showIncidents={showIncidents}
      floodCount={floodPoints ? floodPoints.length : null}
      filtering={filtering}
      onToggleUrb={toggleUrb}
      onZoomUrb={zoomUrb}
      onToggleClass={toggleClass}
      onOverlay={(id, next) =>
        setOverlays((cur) => ({ ...cur, [id]: { ...cur[id], ...next } }))
      }
      onToggleFlood={() => setShowFlood((v) => !v)}
      onToggleIncidents={() => setShowIncidents((v) => !v)}
      onReset={reset}
      onPickRiver={(name) => void pickRiver(name)}
    />
  );
  const insights = (
    <InsightsPanel
      stats={stats}
      loading={statsQuery.isLoading}
      failed={statsQuery.isError}
      onPickUrb={zoomUrb}
      onPickRiver={(name) => void pickRiver(name)}
      className="min-h-0 flex-1"
    />
  );
  const details =
    segment || river || picking ? (
      <DetailsCard
        segment={segment}
        river={river}
        loading={picking && !segment && !river}
        nearbyFlood={nearby.flood}
        nearbyIncidents={nearby.incidents}
        radiusKm={NEARBY_KM}
        onSelectRiver={(name) => void pickRiver(name)}
        onClose={clearSelection}
      />
    ) : null;

  return (
    <div className="bg-muted/20 relative h-full min-h-[560px] flex-1 overflow-hidden">
      <WaterwaysMap
        riverTilesUrl={riverTilesUrl}
        useStatic={waterwayTiles.enabled && !filtering}
        staticTilesUrl={`/waterway-tiles/${waterwayTiles.version}/{z}/{x}/{y}.png`}
        staticMaxZoom={waterwayTiles.maxZoom}
        overlays={overlays}
        highlight={highlight}
        floodPoints={floodPoints ?? []}
        incidentPoints={incidentPoints}
        showFlood={showFlood}
        showIncidents={showIncidents}
        fit={fit}
        onIdentify={(lng, lat, zoom) => void identify(lng, lat, zoom)}
        onPickBasin={zoomUrb}
      />

      <div className="pointer-events-none absolute inset-0 z-20 hidden gap-3 p-3 lg:flex lg:justify-between">
        <div className="flex min-h-0 w-80 flex-col gap-2 pt-9 pb-44">
          <TitleCard km={stats?.totals.km} segments={stats?.totals.segments} />
          {filters}
        </div>
        <div className="flex min-h-0 w-80 flex-col gap-2 pb-[19.5rem]">
          {details ?? insights}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-2 sm:p-3 lg:hidden">
        <div className="glass border-border/60 shadow-panel pointer-events-auto flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Waves className="text-primary size-4 shrink-0" aria-hidden />
            <div className="min-w-0">
              <h1 className="text-foreground truncate text-sm leading-tight font-semibold">
                Waterways
              </h1>
              <p className="text-muted-foreground truncate text-[11px] leading-tight">
                {stats
                  ? `${Math.round(stats.totals.km).toLocaleString()} km of rivers`
                  : "DENR INREMP river system"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <SheetButton
              active={sheet === "filters"}
              onClick={() => setSheet(sheet === "filters" ? null : "filters")}
              icon={<SlidersHorizontal className="size-3.5" aria-hidden />}
              label="Layers"
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
              {sheet === "filters" ? filters : insights}
            </div>
          ) : (
            details
          )}
        </div>
      ) : null}
    </div>
  );
}

function TitleCard({ km, segments }: { km?: number; segments?: number }) {
  return (
    <header className="glass border-border/60 shadow-panel pointer-events-auto flex items-center gap-2.5 rounded-xl border px-3 py-2">
      <span className="bg-primary/15 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Waves className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <h1 className="text-foreground truncate text-sm leading-tight font-semibold">
          Waterways
        </h1>
        <p className="text-muted-foreground truncate text-[11px] leading-tight">
          DENR INREMP river system
          {km !== undefined && segments !== undefined
            ? ` · ${segments.toLocaleString()} segments · ${Math.round(km).toLocaleString()} km`
            : ""}
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
