"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Layers,
  MapPinned,
  Radio,
  TriangleAlert,
  Waves,
} from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { ErrorState } from "@/components/ui/error-state";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { FloodZonesPanel } from "@/features/dashboard/components/widgets/flood-zones-panel";
import { NcrBreakdownPanel } from "@/features/dashboard/components/widgets/ncr-breakdown-panel";
import {
  NcrStatGrid,
  type NcrStat,
} from "@/features/dashboard/components/widgets/ncr-stat-grid";
import { WeatherCard } from "@/features/dashboard/components/widgets/weather-card";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";
import {
  getFloodZones,
  type FloodZoneRow,
} from "@/features/dashboard/lib/flood-zones-summary";
import { getNcrSummary } from "@/features/dashboard/lib/ncr-summary";

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

/** National Operations Center — NCR Critical Areas incidents plus live weather. */
export function OperationsDashboard() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  const summary = useMemo(() => getNcrSummary(), []);
  const [zones, setZones] = useState<FloodZoneRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getFloodZones()
      .then((rows) => {
        if (!cancelled) setZones(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const stats: NcrStat[] = useMemo(
    () => [
      {
        id: "incidents",
        label: "Active Incidents",
        value: summary.total,
        hint: "NCR Critical Areas",
        icon: Waves,
        tone: "danger",
      },
      {
        id: "located",
        label: "Located on Map",
        value: summary.located,
        hint: "Matched to a road",
        icon: CheckCircle2,
        tone: "success",
      },
      {
        id: "review",
        label: "Needs Review",
        value: summary.needsReview,
        hint: "Approximate position",
        icon: TriangleAlert,
        tone: "warning",
      },
      {
        id: "zones",
        label: "Flood-Prone Zones",
        value: zones.filter((z) => z.floodProne).length,
        hint: `${zones.length} mapped zones`,
        icon: Layers,
        tone: "zone",
      },
      {
        id: "deos",
        label: "District Offices",
        value: summary.deoCount,
        hint: `${summary.municipalityCount} cities / municipalities`,
        icon: Building2,
        tone: "primary",
      },
    ],
    [summary, zones],
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
    <FadeIn className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2 sm:gap-3 sm:p-3">
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-md border border-warning/30 bg-warning/5 px-2.5 py-1">
        <div className="flex min-w-0 items-center gap-2">
          <Radio className="size-3.5 shrink-0 animate-pulse text-danger" aria-hidden />
          <p className="truncate text-[11px] font-medium text-foreground sm:text-xs">
            NCR Flood Response — {data.weather.stormStatus}
          </p>
        </div>
        <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:block">
          Weather updated {data.weather.updatedAt}
        </span>
      </div>

      <NcrStatGrid stats={stats} />

      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-1.5 overflow-y-auto sm:gap-2 xl:grid-cols-12 xl:overflow-hidden">
        <div className="relative col-span-2 flex min-h-[300px] min-w-0 flex-col overflow-hidden xl:order-2 xl:col-span-8 xl:min-h-0">
          <DashboardMapPanel className="h-full min-h-[300px] flex-1 xl:min-h-0" />
        </div>

        <div className="flex min-h-0 flex-col gap-1.5 xl:order-1 xl:col-span-2 xl:gap-2 xl:overflow-hidden">
          <NcrBreakdownPanel
            title="By District Office"
            subtitle="Active incidents per DEO"
            icon={<Building2 className="size-4" aria-hidden />}
            rows={summary.byDeo}
            className="max-h-44 min-h-0 flex-1 xl:max-h-none"
          />
          <FloodZonesPanel
            zones={zones}
            className="hidden shrink-0 xl:flex"
          />
        </div>

        <div className="flex min-h-0 flex-col gap-1.5 xl:order-3 xl:col-span-2 xl:gap-2 xl:overflow-hidden">
          <WeatherCard weather={data.weather} className="shrink-0" />
          <NcrBreakdownPanel
            title="Top Cities"
            subtitle="Most active incidents"
            icon={<MapPinned className="size-4" aria-hidden />}
            rows={summary.byMunicipality.slice(0, 8)}
            className="max-h-44 min-h-0 flex-1 xl:max-h-none"
          />
        </div>

        <FloodZonesPanel
          zones={zones}
          className="col-span-2 xl:hidden"
        />
      </div>
    </FadeIn>
  );
}
