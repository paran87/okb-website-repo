"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import {
  Building2,
  CloudRain,
  Layers,
  MapPinned,
  Radio,
  ShieldAlert,
  TriangleAlert,
  Waves,
} from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { ErrorState } from "@/components/ui/error-state";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { NcrBreakdownPanel } from "@/features/dashboard/components/widgets/ncr-breakdown-panel";
import {
  NcrStatGrid,
  type NcrStat,
} from "@/features/dashboard/components/widgets/ncr-stat-grid";
import { WeatherCard } from "@/features/dashboard/components/widgets/weather-card";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";
import { useFloodwatchSummary } from "@/features/floodwatch/hooks/use-floodwatch-summary";
import { FloodSituationPanel } from "@/features/dashboard/components/widgets/flood-situation-panel";
import { useFloodSituation } from "@/features/incident/hooks/use-flood-situation";
import type { FloodMapData } from "@/features/incident/types";

const DashboardMapPanel = dynamic(
  () =>
    import("@/features/dashboard/components/widgets/dashboard-map-panel").then(
      (mod) => ({ default: mod.DashboardMapPanel }),
    ),
  {
    loading: () => (
      <div className="min-h-[280px] flex-1 animate-pulse rounded-card bg-muted/30 xl:min-h-0" />
    ),
  },
);

const WEATHER_TEXT: Record<FloodMapData["weather"]["state"], string> = {
  normal: "Weather normal",
  wet: "Rain / warning in effect",
  unknown: "Weather unknown",
};

/** National Operations Center — the current flood situation from the received reports, plus live weather. */
export function OperationsDashboard() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  const situation = useFloodSituation();
  const { placed, counts, ready } = situation;
  const flood = situation.data;
  const floodwatch = useFloodwatchSummary();
  const fw = floodwatch.data;

  const byDeo = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of placed) {
      const deo = p.location.deo?.trim() || "DEO not reported";
      m.set(deo, (m.get(deo) ?? 0) + 1);
    }
    return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
  }, [placed]);

  const notPassable = placed.filter((p) => /not\s+passable|impassable|closed|no\s+entry/i.test(p.location.roadStatus ?? "")).length;
  const windowHint = flood
    ? `Last ${flood.activeHours} h · ${flood.weather.state === "normal" ? "weather normal" : flood.weather.state === "wet" ? "rain / warning" : "weather unknown"}`
    : situation.query.isError
      ? "Reports unavailable"
      : "Loading reports…";

  const stats: NcrStat[] = useMemo(
    () => [
      {
        id: "flooded",
        label: "Flooded Locations",
        value: placed.length,
        hint: windowHint,
        icon: Waves,
        tone: "primary",
      },
      {
        id: "high",
        label: "High (>1.5 m)",
        value: counts.high ?? 0,
        hint: notPassable ? `${notPassable} road${notPassable === 1 ? "" : "s"} not passable` : "Above neck level",
        icon: ShieldAlert,
        tone: "danger",
      },
      {
        id: "medium",
        label: "Medium (0.5–1.5 m)",
        value: counts.medium ?? 0,
        hint: "Knee to neck level",
        icon: TriangleAlert,
        tone: "warning",
      },
      {
        id: "low",
        label: "Low (0–0.5 m)",
        value: counts.low ?? 0,
        hint: counts.unmeasured ? `+${counts.unmeasured} depth not given` : "Ankle to knee level",
        icon: CloudRain,
        tone: "success",
      },
      {
        id: "zones",
        label: "Flood-Prone Areas",
        value: fw?.totalAreas ?? 0,
        hint: fw
          ? `${fw.byRegion.length} regions · Floodwatch`
          : floodwatch.isError
            ? "Floodwatch unavailable"
            : "Loading Floodwatch…",
        icon: Layers,
        tone: "zone",
      },
    ],
    [placed.length, windowHint, counts, notPassable, fw, floodwatch.isError],
  );

  if (isLoading) return <DashboardSkeleton />;
  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <ErrorState
          title="Dashboard unavailable"
          description="Unable to load operational data. Check your connection and try again."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <FadeIn className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2 sm:gap-3 sm:p-3 xl:overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/5 px-2.5 py-1">
        <div className="flex min-w-0 items-center gap-2">
          <Radio className="size-3.5 shrink-0 animate-pulse text-danger" aria-hidden />
          <p className="truncate text-[11px] font-medium text-foreground sm:text-xs">
            NCR Flood Response —{" "}
            {!ready
              ? "loading the latest reports…"
              : placed.length
                ? `${placed.length} flooded location${placed.length === 1 ? "" : "s"}${counts.high ? ` (${counts.high} high)` : ""}`
                : "no flooded roads reported"}
            {flood ? ` · ${WEATHER_TEXT[flood.weather.state]}` : ""} · {data.weather.stormStatus}
          </p>
        </div>
        <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:block">
          Weather updated {data.weather.updatedAt}
        </span>
      </div>

      <NcrStatGrid stats={stats} />

      <div className="grid shrink-0 grid-cols-1 content-start gap-2 sm:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-12 xl:overflow-hidden">
        <div className="relative flex h-[56dvh] min-h-[320px] min-w-0 flex-col overflow-hidden sm:col-span-2 xl:order-2 xl:col-span-8 xl:h-auto xl:min-h-0">
          <DashboardMapPanel
            className="h-full min-h-0 flex-1"
            placed={placed}
            lines={situation.lines}
            points={situation.points}
            ready={ready}
          />
        </div>

        <div className="contents xl:order-1 xl:col-span-2 xl:flex xl:min-h-0 xl:flex-col xl:gap-2 xl:overflow-hidden">
          <NcrBreakdownPanel
            title="Flooded by District Office"
            subtitle="Flooded places per DEO · latest reports"
            icon={<Building2 className="size-4" aria-hidden />}
            rows={byDeo}
            emptyText={ready ? "No flooded roads reported." : "Loading reports…"}
            className="max-h-60 xl:min-h-0 xl:max-h-none xl:flex-1"
          />
          <NcrBreakdownPanel
            title="Flood-Prone Areas"
            subtitle="Floodwatch · by region"
            icon={<Layers className="size-4" aria-hidden />}
            rows={fw?.byRegion.slice(0, 8) ?? []}
            barColor="#7c3aed"
            className="hidden xl:flex xl:max-h-48 xl:min-h-0 xl:flex-1"
          />
        </div>

        <div className="contents xl:order-3 xl:col-span-2 xl:flex xl:min-h-0 xl:flex-col xl:gap-2 xl:overflow-hidden">
          <WeatherCard weather={data.weather} className="shrink-0" />
          <FloodSituationPanel
            icon={<MapPinned className="size-4" aria-hidden />}
            placed={placed}
            data={flood}
            ready={ready}
            className="max-h-72 xl:min-h-0 xl:max-h-none xl:flex-1"
          />
        </div>

        <NcrBreakdownPanel
          title="Flood-Prone Areas"
          subtitle="Floodwatch · by region"
          icon={<Layers className="size-4" aria-hidden />}
          rows={fw?.byRegion.slice(0, 8) ?? []}
          barColor="#7c3aed"
          className="max-h-60 sm:col-span-2 xl:hidden"
        />
      </div>
    </FadeIn>
  );
}
