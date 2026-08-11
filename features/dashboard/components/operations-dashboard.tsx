"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  TriangleAlert,
} from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/ui/motion";
import { IconButton } from "@/components/ui/icon-button";
import { ErrorState } from "@/components/ui/error-state";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { ActivityTimeline } from "@/features/dashboard/components/widgets/activity-timeline";
import { AlertsPanel } from "@/features/dashboard/components/widgets/alert-card";
import { ConnectionStatus } from "@/features/dashboard/components/widgets/system-health-panel";
import { KpiGrid } from "@/features/dashboard/components/widgets/kpi-card";
import { LeftOperationsPanel } from "@/features/dashboard/components/widgets/left-operations-panel";
import { RightOperationsPanel } from "@/features/dashboard/components/widgets/right-operations-panel";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import { useDashboardData } from "@/features/dashboard/hooks/use-dashboard-data";
import { cn } from "@/utils/cn";

const DashboardMapPanel = dynamic(
  () =>
    import("@/features/dashboard/components/widgets/dashboard-map-panel").then(
      (mod) => ({ default: mod.DashboardMapPanel }),
    ),
  {
    loading: () => (
      <div className="min-h-[320px] flex-1 animate-pulse rounded-card bg-muted/30" />
    ),
  },
);

/** National Operations Center dashboard entry point. */
export function OperationsDashboard() {
  const { data, isLoading, isError, refetch } = useDashboardData();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

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
    <FadeIn className="flex h-[calc(100dvh-4rem-2rem)] min-h-0 flex-col gap-2 p-2 sm:gap-3 sm:p-3">
      {/* Situation banner */}
      <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2">
        <div className="flex items-center gap-2">
          <Radio className="size-4 animate-pulse text-danger" aria-hidden />
          <p className="text-caption font-medium text-foreground">
            NCR Flood Response — Enhanced Monsoon · Alert Level 2
          </p>
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <ConnectionStatus quality="good" />
          <span className="font-mono text-label text-muted-foreground">
            Updated {new Date(data.lastUpdated).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" })} PHT
          </span>
        </div>
      </div>

      {/* KPI row */}
      <Stagger className="shrink-0">
        <StaggerItem>
          <KpiGrid metrics={data.kpis} />
        </StaggerItem>
      </Stagger>

      {/* Main operations grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 sm:gap-3 xl:grid-cols-12">
        {/* Left column */}
        <div
          className={cn(
            "flex min-h-0 flex-col gap-2 xl:col-span-2",
            leftCollapsed && "xl:col-span-1",
          )}
        >
          <div className="flex items-center justify-between xl:hidden">
            <span className="text-caption font-medium text-foreground">
              Operations Feed
            </span>
            <IconButton
              icon={leftCollapsed ? ChevronRight : ChevronLeft}
              label="Toggle left panel"
              variant="ghost"
              size="sm"
              onClick={() => setLeftCollapsed((v) => !v)}
            />
          </div>
          {!leftCollapsed ? (
            <>
              <LeftOperationsPanel
                className="min-h-[240px] flex-1 xl:min-h-0"
                incidents={data.incidents}
                criticalAreas={data.criticalAreas}
                fieldReports={data.fieldReports}
                roadClosures={data.roadClosures}
              />
              <WidgetContainer
                title="Alerts"
                subtitle={`${data.alerts.filter((a) => a.severity === "critical").length} critical`}
                icon={<TriangleAlert className="size-4" aria-hidden />}
                bodyClassName="p-2"
              >
                <AlertsPanel alerts={data.alerts} />
              </WidgetContainer>
            </>
          ) : null}
        </div>

        {/* Center map — ~67% width on xl */}
        <div className="flex min-h-0 flex-col xl:col-span-8">
          <DashboardMapPanel className="h-full flex-1" />
        </div>

        {/* Right column */}
        <div
          className={cn(
            "min-h-0 xl:col-span-2",
            rightCollapsed && "hidden xl:block xl:col-span-1",
          )}
        >
          <div className="mb-1 flex items-center justify-between xl:hidden">
            <span className="text-caption font-medium text-foreground">
              Situational Data
            </span>
            <IconButton
              icon={rightCollapsed ? ChevronLeft : ChevronRight}
              label="Toggle right panel"
              variant="ghost"
              size="sm"
              onClick={() => setRightCollapsed((v) => !v)}
            />
          </div>
          {!rightCollapsed ? (
            <RightOperationsPanel
              weather={data.weather}
              equipment={data.equipment}
              systemHealth={data.systemHealth}
              notifications={data.notifications}
              className="max-h-[600px] xl:max-h-none xl:h-full"
            />
          ) : null}
        </div>
      </div>

      {/* Bottom timeline */}
      <ActivityTimeline events={data.activity} className="shrink-0" />
    </FadeIn>
  );
}
