"use client";

import Link from "next/link";
import { CloudRain, Layers, Waves } from "lucide-react";
import type { FloodwatchCount } from "@/features/floodwatch/types";
import type { PlacedLocation } from "@/features/incident/hooks/use-flood-situation";
import { FLOOD_SEVERITY } from "@/features/incident/lib/flood-severity";
import type { FloodMapData } from "@/features/incident/types";
import { formatMeters, formatRelative } from "@/features/reports/lib/format";
import type { PagasaWeatherBulletinResponse } from "@/features/weather/types";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";

function RankedBars({ rows, color, emptyLabel }: { rows: readonly FloodwatchCount[]; color: string; emptyLabel: string }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  if (rows.length === 0) return <p className="text-[11px] text-muted-foreground">{emptyLabel}</p>;
  return (
    <ul className="space-y-1.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-2 text-[11px] leading-tight">
            <span className="min-w-0 truncate text-foreground">{row.label}</span>
            <span className="shrink-0 font-mono font-medium text-foreground">{row.count.toLocaleString()}</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full" style={{ width: `${(row.count / max) * 100}%`, backgroundColor: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const NCR = /metro\s*manila|\bncr\b|national\s+capital/i;

/** PAGASA warnings that concern Metro Manila, once each. */
export function ncrAdvisories(advisories: PagasaWeatherBulletinResponse["advisories"]) {
  const seen = new Set<string>();
  return advisories.filter((a) => {
    if (!NCR.test(`${a.headline} ${a.areas}`) || seen.has(a.headline)) return false;
    seen.add(a.headline);
    return true;
  });
}

interface InsightsPanelProps {
  placed: PlacedLocation[];
  flood: FloodMapData | undefined;
  ready: boolean;
  weather: PagasaWeatherBulletinResponse | undefined;
  byRegion: readonly FloodwatchCount[];
  regionsLoading: boolean;
  onSelect: (key: string) => void;
  className?: string;
}

/** Beside the map: the flood situation from the received reports, PAGASA weather and flood-prone areas. */
export function InsightsPanel({ placed, flood, ready, weather, byRegion, regionsLoading, onSelect, className }: InsightsPanelProps) {
  const ncr = weather?.ncrObservation;
  const all = weather?.advisories ?? [];
  const advisories = ncrAdvisories(all);
  const elsewhere = new Set(all.map((a) => a.headline)).size - advisories.length;
  return (
    <aside
      aria-label="Flood monitoring insights"
      className={cn(
        "glass pointer-events-auto flex min-h-0 flex-col divide-y divide-border/60 overflow-y-auto rounded-xl border border-border/60 shadow-panel",
        className,
      )}
    >
      <section className="p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Waves className="size-3.5 text-primary" aria-hidden />
          Current situation
        </h3>
        {!ready ? (
          <p className="text-[11px] text-muted-foreground">Loading the latest reports…</p>
        ) : placed.length === 0 ? (
          <p className="text-[11px] font-medium text-success">Normal — no flooding in the received reports.</p>
        ) : (
          <ul className="space-y-0.5">
            {placed.slice(0, 6).map(({ location: l, resolved }) => (
              <li key={l.key}>
                <button
                  type="button"
                  onClick={() => onSelect(l.key)}
                  disabled={resolved.basis === "none"}
                  className="block min-h-10 w-full rounded-md px-1 py-1 text-left text-[11px] leading-tight hover:bg-muted/50 disabled:cursor-default"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: FLOOD_SEVERITY[l.severity].color }} aria-hidden />
                      <span className="truncate font-medium text-foreground">{l.label}</span>
                    </span>
                    <span className="shrink-0 font-mono text-foreground">{formatMeters(l.heightM) ?? "—"}</span>
                  </span>
                  <span className="block truncate pl-3.5 text-[10px] text-muted-foreground">
                    {FLOOD_SEVERITY[l.severity].label} · {formatRelative(l.reportedAt)}
                    {resolved.basis === "none" ? " · not on the map" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {ready && placed.length > 6 ? (
          <Link href={ROUTES.incidents} className="flex min-h-10 items-center px-1 text-[11px] font-semibold text-primary hover:underline">
            All {placed.length} in Incidents
          </Link>
        ) : null}
      </section>

      <section className="p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <CloudRain className="size-3.5 text-sky-500" aria-hidden />
          Weather · PAGASA
        </h3>
        {ncr ? (
          <dl className="grid grid-cols-3 gap-1.5 text-[11px]">
            <div className="rounded-md bg-muted/40 px-2 py-1">
              <dt className="text-[10px] text-muted-foreground">Rain</dt>
              <dd className="font-mono font-semibold text-foreground">
                {ncr.rainfall} {ncr.rainfallUnit}
              </dd>
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1">
              <dt className="text-[10px] text-muted-foreground">Temp</dt>
              <dd className="font-mono font-semibold text-foreground">
                {ncr.temperature}
                {ncr.temperatureUnit}
              </dd>
            </div>
            <div className="rounded-md bg-muted/40 px-2 py-1">
              <dt className="text-[10px] text-muted-foreground">Humidity</dt>
              <dd className="font-mono font-semibold text-foreground">{ncr.humidity}%</dd>
            </div>
            <div className="col-span-3 text-[11px] text-foreground">{ncr.condition}</div>
          </dl>
        ) : (
          <p className="text-[11px] text-muted-foreground">{weather ? "Metro Manila reading unavailable" : "Loading PAGASA…"}</p>
        )}
        {advisories.length ? (
          <ul className="mt-2 space-y-1">
            {advisories.slice(0, 3).map((a) => (
              <li key={a.id} className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] text-foreground">
                <span className="font-semibold capitalize text-warning">{a.level}</span> · {a.headline}
              </li>
            ))}
          </ul>
        ) : weather ? (
          <p className="mt-2 text-[11px] text-muted-foreground">No PAGASA warning for Metro Manila.</p>
        ) : null}
        {weather && elsewhere > 0 ? (
          <p className="mt-1 text-[10px] text-muted-foreground">
            {elsewhere} warning{elsewhere === 1 ? "" : "s"} for other regions (Weather tab)
          </p>
        ) : null}
        {flood ? (
          <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
            {flood.weather.state === "normal"
              ? `Weather normal: the map goes back to normal ${flood.rule.normalHours} h after a road's latest flood report.`
              : `Rain, a warning or unknown weather: flooded roads stay ${flood.rule.wetHours} h after their latest report.`}{" "}
            A report of subsided / no flooding or a receding time clears the road.
          </p>
        ) : null}
      </section>

      <section className="p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Layers className="size-3.5 text-[#7c3aed]" aria-hidden />
          Flood-prone areas by region
        </h3>
        <RankedBars
          rows={byRegion.slice(0, 6)}
          color="#7c3aed"
          emptyLabel={regionsLoading ? "Loading Floodwatch…" : "Floodwatch unavailable"}
        />
      </section>
      <footer className="px-3 py-2 text-[10px] leading-snug text-muted-foreground">
        Sources: received field reports (OKB Bridge) · PAGASA · RainViewer radar · Floodwatch
      </footer>
    </aside>
  );
}
