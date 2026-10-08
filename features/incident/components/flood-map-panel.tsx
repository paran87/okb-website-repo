"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Position } from "geojson";
import { CloudRain, CloudSun, HelpCircle, Map as MapIcon, MapPin, Waves, X } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import { formatDateTime, formatMeters, formatRelative } from "@/features/reports/lib/format";
import { positionsOf, useFloodSituation, type PlacedLocation } from "@/features/incident/hooks/use-flood-situation";
import { FLOOD_SEVERITY, SEVERITY_ORDER } from "@/features/incident/lib/flood-severity";
import type { FloodMapData } from "@/features/incident/types";
import { cn } from "@/utils/cn";

/** Phones: the map sits above the list, out of sight once the list is scrolled, so a tapped location floats it. */
const PHONE_QUERY = "(max-width: 639px)";
const isPhone = () => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches;
/** Height of the floating map; the list gets the same room at its end so every card can scroll above it. */
const FLOAT_H = "h-[min(55dvh,440px)]";

/** Scrolls the list so the card of [key] sits between the top of the page and the floating map. */
function keepCardAboveMap(key: string) {
  const card = document.querySelector(`[data-flood-key="${CSS.escape(key)}"]`);
  const map = document.querySelector("[data-floating-map]");
  const scroller = card?.closest("main");
  if (!card || !map || !scroller) return;
  const r = card.getBoundingClientRect();
  const top = scroller.getBoundingClientRect().top + 8;
  const bottom = map.getBoundingClientRect().top - 8;
  let dy = r.bottom > bottom ? r.bottom - bottom : 0;
  if (r.top - dy < top) dy = r.top - top;
  if (Math.abs(dy) > 1) scroller.scrollBy({ top: dy, behavior: "smooth" });
}

const FloodMap = dynamic(() => import("@/features/incident/components/flood-map").then((m) => m.FloodMap), {
  ssr: false,
  loading: () => <Skeleton className="absolute inset-0 rounded-none" />,
});

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

function placeText(p: PlacedLocation): string {
  const r = p.resolved;
  if (r.basis === "intersection") {
    return `Shown where ${r.matched.join(" and ")} meet${r.places > 1 ? ` (${r.places} places have these road names)` : ""}`;
  }
  if (r.basis === "coordinates") return `Shown on ${r.matched.join(", ")} at the reported coordinates`;
  if (r.basis === "road") return `Shown along ${r.matched[0]}`;
  if (r.basis === "point") return "Shown at the reported coordinates";
  return "Not on the map: the road is not in the DPWH road network";
}

function LocationCard({ p, selected, onSelect }: { p: PlacedLocation; selected: boolean; onSelect: () => void }) {
  const l = p.location;
  const meta = FLOOD_SEVERITY[l.severity];
  const depth = formatMeters(l.heightM);
  const onMap = p.resolved.basis !== "none";
  return (
    <li data-flood-key={l.key}>
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
  const { query, data, placed, lines, points, counts: bySeverity, ready, roadsFailed: failed } = useFloodSituation();
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: number; positions: Position[] } | null>(null);
  const [floating, setFloating] = useState(false);
  const framed = useRef(false);

  // Back in the page when the screen is no longer phone-sized; Escape closes it.
  useEffect(() => {
    if (!floating) return;
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = () => {
      if (!mq.matches) setFloating(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFloating(false);
    };
    mq.addEventListener("change", onChange);
    window.addEventListener("keydown", onKey);
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("keydown", onKey);
    };
  }, [floating]);

  // Frame all flooded roads once they are known.
  useEffect(() => {
    if (framed.current || !ready) return;
    framed.current = true;
    const all = placed.flatMap(positionsOf);
    if (all.length) setFocus({ id: Date.now(), positions: all });
  }, [ready, placed]);

  const select = useCallback(
    (key: string | null) => {
      setSelected(key);
      const p = key ? placed.find((x) => x.location.key === key) : null;
      if (p) setFocus({ id: Date.now(), positions: positionsOf(p) });
      if (!p || !isPhone()) return;
      setFloating(true);
      // Keep its card in sight above the floating map (also when it was picked on the map).
      requestAnimationFrame(() => keepCardAboveMap(p.location.key));
    },
    [placed],
  );

  const current = selected ? placed.find((x) => x.location.key === selected) : undefined;
  const counts = SEVERITY_ORDER.map((s) => ({ s, n: bySeverity[s] })).filter((c) => c.n > 0);
  const offMap = placed.filter((p) => p.resolved.basis === "none").length;

  return (
    <Card className={cn("space-y-4 p-4", floating && "pb-[calc(min(55dvh,440px)+3rem)]")}>
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

      {/* The same map element floats (no second map: the map store is per page); its place stays reserved. */}
      <div className="relative h-[340px] sm:h-[420px] lg:h-[480px]">
        {floating ? (
          <button
            type="button"
            onClick={() => setFloating(false)}
            className="flex size-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-caption text-muted-foreground"
          >
            <MapIcon className="size-6" aria-hidden />
            The map is open at the bottom of the screen · tap to put it back here
          </button>
        ) : null}
        <div
          className={cn(
            "overflow-hidden",
            floating
              ? cn("fixed inset-x-2 bottom-10 z-40 rounded-xl border border-primary/60 bg-card shadow-2xl", FLOAT_H)
              : "absolute inset-0 rounded-lg border border-border",
          )}
          data-floating-map={floating ? "" : undefined}
          role={floating ? "dialog" : undefined}
          aria-label={floating ? "Flood map" : undefined}
        >
          <FloodMap lines={lines} points={points} selectedKey={selected} focus={focus} onSelect={select} />
          <MapKey className="pointer-events-auto absolute left-2 top-2 z-10 hidden max-w-[11.5rem] sm:block" />
          {ready && placed.length === 0 ? (
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
          {floating ? (
            <div className="absolute inset-x-2 top-2 z-20 flex items-start gap-2">
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-card/95 px-2.5 py-1.5 text-caption shadow-sm backdrop-blur">
                {current ? (
                  <>
                    <p className="flex items-center gap-1.5 font-semibold" style={{ color: FLOOD_SEVERITY[current.location.severity].color }}>
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: FLOOD_SEVERITY[current.location.severity].color }} aria-hidden />
                      {FLOOD_SEVERITY[current.location.severity].label}
                      {formatMeters(current.location.heightM) ? (
                        <span className="text-foreground">
                          {current.location.heightApproximate ? "≈ " : ""}
                          {formatMeters(current.location.heightM)}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-foreground">{current.location.label}</p>
                  </>
                ) : (
                  <p className="py-1 text-muted-foreground">Tap a flooded road or a location in the list</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFloating(false)}
                aria-label="Close the map"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card/95 text-foreground shadow-sm backdrop-blur hover:bg-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
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
