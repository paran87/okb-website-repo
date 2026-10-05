"use client";

import { BarChart3, CalendarDays, Gauge, Layers, MapPinned, Radio, RefreshCw, Users, Waves } from "lucide-react";
import { BarChart } from "@/components/charts/bar-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/features/reports/lib/format";
import { useReportAnalytics } from "@/features/reports/hooks/use-reports";
import { CountBars, MetricTile, OpsSection } from "@/features/reports/components/report-ui";

function shortDay(day: string): string {
  const [, m, d] = day.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[Number(m) - 1] ?? m} ${Number(d)}`;
}

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

export function ReportAnalyticsView() {
  const analytics = useReportAnalytics();
  const a = analytics.data?.data;

  if (analytics.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }
  if (analytics.isError || !a) {
    return (
      <Card>
        <ErrorState
          title="Unable to retrieve reports"
          description={analytics.error?.message ?? "Unable to retrieve reports. Check backend connection."}
          onRetry={() => analytics.refetch()}
        />
      </Card>
    );
  }

  const daily = a.daily.map((d) => ({ day: shortDay(d.day), Reports: d.reports }));
  const flood = a.floodDaily.map((d) => ({ day: shortDay(d.day), Flooded: d.flooded, "No flooding": d.clear, "Not reported": d.unknown }));
  const hasFlood = a.floodDaily.some((d) => d.flooded + d.clear + d.unknown > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          Last {a.window.days} days (Philippine time) · generated {formatDateTime(a.generatedAt)} · messages classified as not
          flood reports are excluded
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => analytics.refetch()}
          leftIcon={<RefreshCw className={cn("size-3.5", analytics.isFetching && "animate-spin")} aria-hidden />}
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <MetricTile label="Received today" value={a.received.today} tone="info" />
        <MetricTile label="This week" value={a.received.week} tone="info" />
        <MetricTile label="Last 30 days" value={a.received.month} tone="info" />
        <MetricTile label="AI processing rate" value={pct(a.rates.aiProcessed)} sub="of reports received" />
        <MetricTile label="Reviewed rate" value={pct(a.rates.reviewed)} sub="of AI-processed reports" />
        <MetricTile
          label="Confirmed incident rate"
          value={pct(a.rates.confirmedIncidents)}
          sub={a.rates.confirmedIncidents === null ? "incident storage not set up" : "incidents per report"}
        />
      </div>
      {a.truncated ? <p className="text-[11px] text-warning">Aggregates cover the most recent 5,000 reports.</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <OpsSection title="Report frequency over time" icon={CalendarDays}>
          <BarChart data={daily} xKey="day" series={[{ dataKey: "Reports", color: "var(--primary)" }]} height={240} showLegend={false} />
        </OpsSection>
        <OpsSection title="Flood conditions over time · location observations" icon={Waves}>
          {hasFlood ? (
            <BarChart
              data={flood}
              xKey="day"
              height={240}
              series={[
                { dataKey: "Flooded", color: "var(--warning)", stackId: "a" },
                { dataKey: "No flooding", color: "var(--success)", stackId: "a" },
                { dataKey: "Not reported", color: "var(--muted-foreground)", stackId: "a" },
              ]}
            />
          ) : (
            <p className="py-10 text-center text-caption text-muted-foreground">No AI-processed flood reports in the last 14 days.</p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Each bar counts monitored-location observations in that day&apos;s flood reports (last 14 days, {a.floodSampleSize} reports).
            A location reported several times in a day is counted each time.
          </p>
        </OpsSection>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OpsSection title="Reports by source" icon={Radio}>
          <CountBars items={a.bySource} />
        </OpsSection>
        <OpsSection title="Reports by group" icon={Users}>
          <CountBars items={a.byGroup} />
        </OpsSection>
        <OpsSection title="Reports by region" icon={MapPinned}>
          <CountBars items={a.byRegion} />
        </OpsSection>
        <OpsSection title="Reports by report type" icon={Layers}>
          <CountBars items={a.byReportType} />
        </OpsSection>
        <OpsSection title="Reports by status" icon={Gauge}>
          <CountBars items={a.byStatus} />
        </OpsSection>
        <OpsSection title="Not available" icon={BarChart3}>
          <p className="text-caption text-muted-foreground">
            Breakdowns by severity and incident type are not shown: the OKB Bridge extraction does not assign them, and they
            are not inferred. Severity is recorded only on operator-created incidents.
          </p>
        </OpsSection>
      </div>
    </div>
  );
}
