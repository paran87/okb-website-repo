"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Position } from "geojson";
import { CloudRain, CloudSun, HelpCircle, MapPin, Waves } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import { formatDateTime, formatMeters, formatRelative } from "@/features/reports/lib/format";
import { loadRoads } from "@/features/road-network/lib/data";
import type { RoadFeature } from "@/features/road-network/types";
import { useFloodMap } from "@/features/incident/hooks/use-flood-map";
import { FLOOD_SEVERITY, SEVERITY_ORDER, type FloodSeverity } from "@/features/incident/lib/flood-severity";
import { buildRoadIndex, resolveLocation, type ResolvedLocation } from "@/features/incident/lib/road-match";
import type { FloodMapData, FloodMapLocation } from "@/features/incident/types";
import type { FloodLineFeature, FloodPointFeature } from "@/features/incident/components/flood-map";
import { cn } from "@/utils/cn";

const FloodMap = dynamic(() => import("@/features/incident/components/flood-map").then((m) => m.FloodMap), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-none" />,
});

const RANK: Record<FloodSeverity, number> = { unmeasured: 0, low: 1, medium: 2, high: 3 };

interface Placed {
  location: FloodMapLocation;
  resolved: ResolvedLocation;
}

function useRoads() {
  const [roads, setRoads] = useState<RoadFeature[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadRoads()
      .then((r) => live && setRoads(r))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);
  return { roads, failed };
}

function positionsOf(p: Placed): Position[] {
  return [...p.resolved.lines.flat(), ...(p.resolved.point ? [p.resolved.point] : [])];
}

function WeatherStatus({ data }: { data: FloodMapData }) {
  const w = data.weather;
  const meta: Record<FloodMapData["weather"]["state"], { icon: typeof CloudSun; variant: BadgeVariant; title: string }> = {
    normal: { icon: CloudSun, variant: "success", title: "Weather normal" },
    wet: { icon: CloudRain, variant: "warning", title: "Rain / warning" },
    unknown: { icon: HelpCircle, variant: "default", title: "Weather unknown" },
  };
  const m = meta[w.state];
  const Icon = m.icon;
  return (
    <div className="flex items-start gap-2 text-caption">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={m.variant} dot>
            {m.title}
          </Badge>
          <span className="break-words text-muted-foreground">{w.label}</span>
        </div>
        <p className="text-muted-foreground">
          {w.state === "normal"
            ? `Back to normal: a flooded road is cleared ${data.rule.normalHours} h after its latest report.`
            : `Flooded roads stay highlighted ${data.rule.wetHours} h after their latest report${w.state === "unknown" ? " until live weather is back" : " while it rains or a warning is in effect"}.`}{" "}
          A report that says subsided or no flooding clears a place at once.
        </p>
      </div>
    </div>
  );
}

/** Compact legend: on the map from sm up, a row under the map on phones (the map stays clear). */
function MapKey({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card/95 px-2.5 py-2 text-[11px] shadow-sm backdrop-blur", className)}>
      <p className="mb-1 font-semibold text-foreground">Flood depth</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 sm:block sm:space-y-1">
        {SEVERITY_ORDER.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className="h-1.5 w-5 shrink-0 rounded-full" style={{ backgroundColor: FLOOD_SEVERITY[s].color }} aria-hidden />
            <span className="text-foreground">
              {s === "unmeasured" ? "Depth not given" : `${FLOOD_SEVERITY[s].label} · ${FLOOD_SEVERITY[s].range.split(" (")[0]}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The OKB severity categories: cards on phones, a table where it fits. */
function SeverityTable() {
  const rows = (["low", "medium", "high"] as const).map((s) => ({ s, ...FLOOD_SEVERITY[s] }));
  return (
    <div className="@container">
      <ul className="space-y-2 @2xl:hidden">
        {rows.map((r) => (
          <li key={r.s} className="rounded-lg border border-border p-3 text-caption">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">
                {r.emoji} {r.label}
              </span>
              <span className="text-muted-foreground">{r.range}</span>
            </div>
            <p className="mt-1 text-muted-foreground">{r.meaning}</p>
          </li>
        ))}
      </ul>
      <table className="hidden w-full text-left text-caption @2xl:table">
        <thead className="text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 font-semibold">Flood depth</th>
            <th className="px-3 py-2 font-semibold">Severity</th>
            <th className="px-3 py-2 font-semibold">General meaning</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.s} className="border-b border-border last:border-0">
              <td className="whitespace-nowrap px-3 py-2 text-foreground">{r.range}</td>
              <td className="whitespace-nowrap px-3 py-2 font-semibold text-foreground">
                {r.emoji} {r.label}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{r.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function placeText(p: Placed): string {
  const r = p.resolved;
  if (r.basis === "intersection") {
    return `Shown where ${r.matched.join(" and ")} meet${r.places > 1 ? ` (${r.places} places have these road names)` : ""}`;
  }
  if (r.basis === "coordinates") return `Shown on ${r.matched.join(", ")} at the reported coordinates`;
  if (r.basis === "road") return `Shown along ${r.matched[0]}`;
  if (r.basis === "point") return "Shown at the reported coordinates";
  return "Not on the map: the road is not in the DPWH road network";
}

function LocationCard({ p, selected, onSelect }: { p: Placed; selected: boolean; onSelect: () => void }) {
  const l = p.location;
  const meta = FLOOD_SEVERITY[l.severity];
  const depth = formatMeters(l.heightM);
  const onMap = p.resolved.basis !== "none";
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={!onMap}
        className={cn(
          "w-full rounded-lg border p-3 text-left text-caption transition-colors disabled:cursor-default",
          selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: meta.color }}>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
            {meta.label}
          </span>
          {depth ? (
            <span className="font-semibold text-foreground">
              {l.heightApproximate ? "≈ " : ""}
              {depth}
            </span>
          ) : null}
          <span className="text-muted-foreground">{formatRelative(l.reportedAt)}</span>
        </div>
        <p className="mt-1 break-words text-body font-medium text-foreground">{l.label}</p>
        {l.roadStatus ? <p className="break-words text-muted-foreground">Road: {l.roadStatus}</p> : null}
        <p className={cn("mt-1 flex items-start gap-1 break-words", onMap ? "text-muted-foreground" : "text-warning")}>
          <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {placeText(p)}
        </p>
        <p className="mt-1 text-muted-foreground">
          {l.reference} · {formatDateTime(l.reportedAt)}
          {l.deo ? ` · ${l.deo}` : ""} · clears {formatDateTime(l.clearsAt)} unless reported again
        </p>
      </button>
      <Link href={`${ROUTES.reports}/${l.reportId}`} className="mt-1 inline-flex min-h-10 items-center px-1 text-caption font-semibold text-primary hover:underline">
        View report
      </Link>
    </li>
  );
}

/** Incidents tab: flooded roads from the received reports, by depth, back to normal as the weather clears. */
export function FloodMapPanel() {
  const query = useFloodMap();
  const { roads, failed } = useRoads();
  const index = useMemo(() => (roads ? buildRoadIndex(roads) : null), [roads]);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: number; positions: Position[] } | null>(null);
  const framed = useRef(false);
  const data = query.data;

  const placed = useMemo<Placed[]>(() => {
    if (!data || !index) return [];
    return data.locations
      .map((location) => ({ location, resolved: resolveLocation(index, location) }))
      .sort(
        (a, b) =>
          RANK[b.location.severity] - RANK[a.location.severity] || Date.parse(b.location.reportedAt) - Date.parse(a.location.reportedAt),
      );
  }, [data, index]);

  const lines = useMemo<FloodLineFeature[]>(
    () =>
      placed
        .filter((p) => p.resolved.lines.length)
        .map((p) => ({
          type: "Feature",
          geometry: { type: "MultiLineString", coordinates: p.resolved.lines },
          properties: { key: p.location.key, color: FLOOD_SEVERITY[p.location.severity].color, rank: RANK[p.location.severity] },
        })),
    [placed],
  );
  const points = useMemo<FloodPointFeature[]>(
    () =>
      placed
        .filter((p) => p.resolved.point && (p.resolved.basis === "point" || p.resolved.basis === "coordinates" || p.resolved.basis === "intersection"))
        .map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: p.resolved.point as Position },
          properties: { key: p.location.key, color: FLOOD_SEVERITY[p.location.severity].color, rank: RANK[p.location.severity] },
        })),
    [placed],
  );

  // Frame all flooded roads once they are known.
  useEffect(() => {
    if (framed.current || !index || !data) return;
    framed.current = true;
    const all = placed.flatMap(positionsOf);
    if (all.length) setFocus({ id: Date.now(), positions: all });
  }, [index, data, placed]);

  const select = useCallback(
    (key: string | null) => {
      setSelected(key);
      const p = key ? placed.find((x) => x.location.key === key) : null;
      if (p) setFocus({ id: Date.now(), positions: positionsOf(p) });
    },
    [placed],
  );

  const counts = SEVERITY_ORDER.map((s) => ({ s, n: placed.filter((p) => p.location.severity === s).length })).filter((c) => c.n > 0);
  const offMap = placed.filter((p) => p.resolved.basis === "none").length;

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start gap-2">
        <Waves className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <h2 className="text-subheading text-foreground">Flood map</h2>
          <p className="text-caption text-muted-foreground">Flooded roads from the received reports, colored by reported flood depth.</p>
        </div>
      </div>

      {query.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : query.isError ? (
        <ErrorState title="Flood map unavailable" description={query.error.message} onRetry={() => query.refetch()} />
      ) : data ? (
        <WeatherStatus data={data} />
      ) : null}

      <div className="relative h-[340px] overflow-hidden rounded-lg border border-border sm:h-[420px] lg:h-[480px]">
        <FloodMap lines={lines} points={points} selectedKey={selected} focus={focus} onSelect={select} />
        <MapKey className="pointer-events-auto absolute left-2 top-2 z-10 hidden max-w-[11.5rem] sm:block" />
        {data && index && placed.length === 0 ? (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex justify-center">
            <span className="rounded-full border border-border bg-card/95 px-3 py-1.5 text-caption font-semibold text-success shadow-sm">
              No flooded roads reported — normal conditions
            </span>
          </div>
        ) : null}
        {failed ? (
          <div className="absolute inset-x-2 bottom-2 z-10 rounded-lg border border-border bg-card/95 px-3 py-2 text-caption text-danger">
            The road network could not be loaded; the flooded locations are listed below.
          </div>
        ) : null}
      </div>

      <MapKey className="sm:hidden" />

      {data ? (
        <p className="text-caption text-muted-foreground">
          {placed.length
            ? `${placed.length} flooded location${placed.length === 1 ? "" : "s"}: ${counts.map((c) => `${c.n} ${FLOOD_SEVERITY[c.s].label.toLowerCase()}`).join(", ")}${offMap ? ` · ${offMap} not on the map` : ""}`
            : "No flooded location in the received reports."}
          {data.clearedByReport ? ` · ${data.clearedByReport} cleared by a later report` : ""}
          {data.clearedByWeather ? ` · ${data.clearedByWeather} back to normal (weather)` : ""}
        </p>
      ) : null}

      {placed.length ? (
        <ul className="grid gap-2 @container sm:grid-cols-2 xl:grid-cols-3">
          {placed.map((p) => (
            <LocationCard key={p.location.key} p={p} selected={selected === p.location.key} onSelect={() => select(p.location.key)} />
          ))}
        </ul>
      ) : null}

      <div className="space-y-2">
        <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Severity</h3>
        <SeverityTable />
      </div>
    </Card>
  );
}
