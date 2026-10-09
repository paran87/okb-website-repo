"use client";

import dynamic from "next/dynamic";
import type { Position } from "geojson";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CloudRain, List, Radio, Siren, Waves, X } from "lucide-react";
import { LayerToggleCard } from "@/features/flood-monitoring/components/layer-toggle-card";
import { FloodLayers, type FloodMapProps } from "@/features/incident/components/flood-map";
import { FloodAlertPanel } from "@/features/incident/components/flood-alert-panel";
import { positionsOf, useFloodSituation } from "@/features/incident/hooks/use-flood-situation";
import { FLOOD_SEVERITY, SEVERITY_ORDER } from "@/features/incident/lib/flood-severity";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { formatMeters, formatRelative } from "@/features/reports/lib/format";
import { WeatherRadarOverlay } from "@/features/weather/components/weather-radar-overlay";
import { cn } from "@/utils/cn";

const MapEngine = dynamic(() => import("@/features/map/components/map-engine").then((m) => ({ default: m.MapEngine })), {
  ssr: false,
});

const RAIN_COLOR = "#0284c7";
const INCIDENT_COLOR = "#f59e0b";
const NORMAL_COLOR = "#16a34a";
const WEATHER_TEXT = { normal: "Normal", wet: "Rain", unknown: "—" } as const;

type Panel = "flooded" | "incidents";

/**
 * Incidents on phones, laid out like the Flood Monitoring overview: a full-screen map of the flooded roads from
 * the received reports with floating summaries; the flooded locations and the confirmed incidents open in a panel.
 */
export function IncidentsMobile({ incidents, incidentCount }: { incidents: ReactNode; incidentCount: number | null }) {
  const { placed, counts, ready, lines, points, data: flood, query } = useFloodSituation();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [floodVisible, setFloodVisible] = useState(true);
  const [radarOn, setRadarOn] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<FloodMapProps["focus"]>(null);
  const framed = useRef(false);
  const radarAuto = useRef(false);

  // Frame the flooded roads once they are known.
  useEffect(() => {
    if (framed.current || !ready) return;
    framed.current = true;
    const all = placed.flatMap(positionsOf);
    if (all.length) setFocus({ id: Date.now(), positions: all });
  }, [ready, placed]);

  // Rain radar on by itself while it rains or a warning is in effect (it can be switched off).
  useEffect(() => {
    if (radarAuto.current || !flood) return;
    radarAuto.current = true;
    if (flood.weather.state === "wet") setRadarOn(true);
  }, [flood]);

  const select = useCallback(
    (key: string | null, area?: Position[]) => {
      setSelected(key);
      const p = key ? placed.find((x) => x.location.key === key) : null;
      if (p) {
        setFloodVisible(true);
        // Between the summaries at the top and the flood alert panel at the bottom.
        setFocus({ id: Date.now(), positions: area ?? positionsOf(p), padding: { top: 210, bottom: 340 } });
      }
    },
    [placed],
  );
  const current = selected ? (placed.find((p) => p.location.key === selected) ?? null) : null;
  const toggle = (p: Panel) => setPanel((open) => (open === p ? null : p));

  const worst = SEVERITY_ORDER.find((s) => counts[s] > 0) ?? null;
  const status = query.isError
    ? { text: "Unavailable", className: "bg-muted text-muted-foreground" }
    : !ready
      ? { text: "Loading…", className: "bg-muted text-muted-foreground" }
      : placed.length
        ? { text: `Live · ${placed.length} flooded`, className: "bg-danger/15 text-danger" }
        : { text: "Live · Normal", className: "bg-success/15 text-success" };

  return (
    <div className="relative min-h-[480px] flex-1 overflow-hidden bg-muted/20">
      <MapEngine
        initialView={NCR_MAP_VIEW}
        initialStyleId="light"
        lockBasemap
        initialLayers={[]}
        showSearch={false}
        showLayerPanel={false}
        showLegend={false}
        showBasemapSwitcher
        showStatus={false}
        className="absolute inset-0 h-full w-full"
      />
      <WeatherRadarOverlay enabled={radarOn} onEnabledChange={setRadarOn} hideButton />
      <FloodLayers lines={lines} points={points} selectedKey={selected} focus={focus} onSelect={select} visible={floodVisible} alerts />

      <div className="pointer-events-none absolute inset-0 z-30 flex flex-col gap-1.5 p-2">
        <header className="glass pointer-events-auto flex items-center justify-between gap-2 rounded-xl border border-border/60 py-1 pl-2 pr-1 shadow-panel">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold leading-tight text-foreground">Incidents</h1>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">Flood map · received reports</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                status.className,
              )}
            >
              <Radio className="size-3 motion-safe:animate-pulse" aria-hidden />
              {status.text}
            </span>
            <button
              type="button"
              onClick={() => toggle("flooded")}
              aria-expanded={panel !== null}
              className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border/60 px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              {panel ? <X className="size-3.5" aria-hidden /> : <List className="size-3.5" aria-hidden />}
              Details
            </button>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-1.5">
          <LayerToggleCard
            label="Flooded roads"
            value={ready ? placed.length.toLocaleString() : "—"}
            caption=""
            color={worst ? FLOOD_SEVERITY[worst].color : NORMAL_COLOR}
            icon={Waves}
            visible={floodVisible}
            onToggle={() => setFloodVisible((v) => !v)}
            className="min-w-0"
          />
          <LayerToggleCard
            label="Rain radar"
            value={flood ? WEATHER_TEXT[flood.weather.state] : "—"}
            caption=""
            color={RAIN_COLOR}
            icon={CloudRain}
            visible={radarOn}
            onToggle={() => setRadarOn((v) => !v)}
            className="min-w-0"
          />
          <LayerToggleCard
            label="Incidents"
            value={incidentCount === null ? "—" : incidentCount.toLocaleString()}
            caption=""
            color={INCIDENT_COLOR}
            icon={Siren}
            onToggle={() => toggle("incidents")}
            actionLabel={`${panel === "incidents" ? "Close" : "Open"} the confirmed incidents`}
            className={cn("min-w-0", panel === "incidents" && "ring-2 ring-primary")}
          />
        </div>

        <ul
          aria-label="Map legend"
          className="glass pointer-events-none flex flex-wrap gap-x-2.5 gap-y-1 self-start rounded-lg px-2 py-1 text-[10px] font-medium text-foreground shadow-panel"
        >
          {SEVERITY_ORDER.map((s) => (
            <li key={s} className="flex items-center gap-1">
              <span className="h-1.5 w-3 rounded-full" style={{ backgroundColor: FLOOD_SEVERITY[s].color }} aria-hidden />
              {s === "unmeasured" ? "No depth" : FLOOD_SEVERITY[s].label}
            </li>
          ))}
        </ul>

        {ready && placed.length === 0 && !panel ? (
          <p className="glass pointer-events-none self-start rounded-full px-3 py-1.5 text-[11px] font-semibold text-success shadow-panel">
            Normal — no flooded roads in the received reports
          </p>
        ) : null}

        {panel ? (
          <section
            aria-label="Incident details"
            className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-panel"
          >
            <div className="flex items-center gap-1 border-b border-border/60 p-1" role="tablist">
              {(
                [
                  ["flooded", `Flooded now${ready ? ` (${placed.length})` : ""}`],
                  ["incidents", `Incidents${incidentCount === null ? "" : ` (${incidentCount})`}`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={panel === key}
                  onClick={() => setPanel(key)}
                  className={cn(
                    "min-h-10 flex-1 rounded-lg px-2 text-[12px] font-semibold transition-colors",
                    panel === key ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="Close details"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {panel === "flooded" ? (
                <FloodedList
                  rows={placed}
                  ready={ready}
                  failed={query.isError ? query.error.message : null}
                  rule={
                    flood
                      ? `${flood.weather.label}. ${
                          flood.weather.state === "normal"
                            ? `A flooded road is cleared ${flood.rule.normalHours} h after its latest report.`
                            : `Flooded roads stay ${flood.rule.wetHours} h after their latest report.`
                        } A report of subsided / no flooding or a receding time clears the road.`
                      : null
                  }
                  onSelect={(key) => {
                    select(key);
                    setPanel(null);
                  }}
                />
              ) : (
                <div className="p-2">{incidents}</div>
              )}
            </div>
          </section>
        ) : null}
      </div>

      {current && !panel ? (
        <FloodAlertPanel placed={current} onClose={() => setSelected(null)} className="absolute inset-x-2 bottom-2 z-40 max-h-[60%]" />
      ) : null}
    </div>
  );
}

function FloodedList({
  rows,
  ready,
  failed,
  rule,
  onSelect,
}: {
  rows: ReturnType<typeof useFloodSituation>["placed"];
  ready: boolean;
  failed: string | null;
  rule: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="space-y-2 p-2">
      {failed ? (
        <p className="px-1 text-[11px] text-danger">{failed}</p>
      ) : !ready ? (
        <p className="px-1 text-[11px] text-muted-foreground">Loading the latest reports…</p>
      ) : rows.length === 0 ? (
        <p className="px-1 text-[11px] font-medium text-success">Normal — no flooding in the received reports.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map(({ location: l, resolved }) => (
            <li key={l.key}>
              <button
                type="button"
                onClick={() => onSelect(l.key)}
                disabled={resolved.basis === "none"}
                className="block min-h-11 w-full px-1 py-1.5 text-left text-[12px] leading-tight hover:bg-muted/50 disabled:cursor-default"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: FLOOD_SEVERITY[l.severity].color }} aria-hidden />
                    <span className="truncate font-medium text-foreground">{l.label}</span>
                  </span>
                  <span className="shrink-0 font-mono text-foreground">{formatMeters(l.heightM) ?? "—"}</span>
                </span>
                <span className="block truncate pl-3.5 text-[11px] text-muted-foreground">
                  {FLOOD_SEVERITY[l.severity].label} · {formatRelative(l.reportedAt)}
                  {l.deo ? ` · ${l.deo}` : ""}
                  {l.roadStatus ? ` · ${l.roadStatus}` : ""}
                  {resolved.basis === "none" ? " · not on the map" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {rule ? <p className="px-1 text-[10px] leading-snug text-muted-foreground">{rule}</p> : null}
    </div>
  );
}
