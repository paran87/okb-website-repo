"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Bot, GitCompareArrows, Layers, MapPinned, Radio, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import type { SeriesComparison } from "@/features/reports/types";
import { parseAiSummary } from "@/features/reports/lib/ai-summary";
import { formatDate, formatDateTime, formatShortDateTime } from "@/features/reports/lib/format";
import { useSituationSummary } from "@/features/reports/hooks/use-reports";
import { AiPanel, CountBars, MetricTile, OpsSection } from "@/features/reports/components/report-ui";
import { LocationHistoryDrawer, SeriesChangePanel } from "@/features/reports/components/situation-change";
import { MonitoringPeriodFilter, type MonitoringPeriodValue } from "@/features/reports/components/monitoring-period-filter";
import { monitoringPeriodLabel } from "@/features/reports/lib/monitoring-period";

const WINDOWS = [
  { hours: 6, label: "6 h" },
  { hours: 24, label: "24 h" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
];

function SeriesCard({ s }: { s: SeriesComparison }) {
  const [historyKey, setHistoryKey] = useState<string | null>(null);
  return (
    <OpsSection
      title={`Monitoring series · ${formatShortDateTime(s.current.messageTime)}`}
      icon={GitCompareArrows}
      actions={
        <Link href={`${ROUTES.reports}/${s.current.id}`} className="font-mono text-[11px] text-primary hover:underline">
          {s.current.reference}
        </Link>
      }
    >
      <SeriesChangePanel comparison={s} onLocationHistory={setHistoryKey} compact />
      <LocationHistoryDrawer reportId={s.current.id} locationKey={historyKey} onClose={() => setHistoryKey(null)} />
    </OpsSection>
  );
}

export function AiSituationView() {
  const [hours, setHours] = useState(24);
  const [period, setPeriod] = useState<MonitoringPeriodValue | null>(null);
  const summary = useSituationSummary(period ?? { hours });
  const data = summary.data?.data;

  return (
    <div className="space-y-2.5 sm:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div role="radiogroup" aria-label="Time window" className="grid w-full grid-cols-4 rounded-lg border border-border bg-muted/40 p-0.5 sm:flex sm:w-auto">
          {WINDOWS.map((w) => (
            <button
              key={w.hours}
              type="button"
              role="radio"
              aria-checked={!period && hours === w.hours}
              onClick={() => {
                setHours(w.hours);
                setPeriod(null);
              }}
              className={cn(
                "min-h-9 whitespace-nowrap rounded-md px-1.5 py-1 text-[12px] font-semibold transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-caption",
                !period && hours === w.hours ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Last {w.label}
            </button>
          ))}
        </div>
        <span className="flex w-full items-center justify-between gap-2 text-[10px] text-muted-foreground sm:w-auto sm:justify-start sm:text-[11px]">
          {period
            ? `Monitoring period: ${formatDate(`${period.day}T12:00:00+08:00`)} · ${monitoringPeriodLabel(period.period)}`
            : data
              ? `Window: ${formatDateTime(data.window.from)} – ${formatDateTime(data.window.to)}`
              : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => summary.refetch()}
            leftIcon={<RefreshCw className={cn("size-3.5", summary.isFetching && "animate-spin")} aria-hidden />}
          >
            Refresh
          </Button>
        </span>
      </div>

      <MonitoringPeriodFilter value={period} onChange={setPeriod} />

      {summary.isPending ? (
        <div className="space-y-3" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : summary.isError ? (
        <Card>
          <ErrorState title="Unable to retrieve reports" description={summary.error.message} onRetry={() => summary.refetch()} />
        </Card>
      ) : data ? (
        <>
          <OpsSection title="Current report status" icon={Activity}>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 xl:grid-cols-6">
              <MetricTile label="Total reports" value={data.totals.reports} tone="info" />
              <MetricTile label="AI processed" value={data.totals.aiProcessed} tone="info" />
              <MetricTile label="Pending review" value={data.totals.pendingReview} tone={data.totals.pendingReview ? "warning" : "muted"} />
              <MetricTile label="Reviewed" value={data.totals.reviewed} tone={data.totals.reviewed ? "success" : "muted"} />
              <MetricTile
                label="Confirmed incidents"
                value={data.totals.confirmedIncidents ?? "—"}
                tone={data.totals.confirmedIncidents ? "danger" : "muted"}
                sub={data.totals.confirmedIncidents === null ? "storage not set up" : "created by operators"}
              />
              <MetricTile label="AI failed" value={data.totals.failed} tone={data.totals.failed ? "danger" : "muted"} />
            </div>
            {data.truncated ? (
              <p className="mt-2 text-[11px] text-warning">Counts cover the most recent 5,000 reports in this window.</p>
            ) : null}
          </OpsSection>

          {/* Cross-report AI narrative: only shown if the backend generated one. */}
          {data.aiSituation ? (
            <AiPanel title="AI Situation Assessment" footer={<span>· {formatDateTime(data.aiSituation.generatedAt)}</span>}>
              {data.aiSituation.text}
            </AiPanel>
          ) : (
            <section className="rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-3 sm:p-4">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                <Bot className="size-4" aria-hidden />
                Current AI situation
              </p>
              <p className="mt-1 text-body text-foreground">AI situation summary is not currently available.</p>
              <p className="mt-1 text-caption text-muted-foreground">
                The OKB Bridge generates AI summaries per report (below), not a cross-report assessment. The monitoring-series
                changes on this page are computed from AI-extracted values, not written by AI.
              </p>
            </section>
          )}

          <div className="grid gap-2.5 sm:gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-2.5 sm:space-y-4">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <MapPinned className="size-4 text-primary" aria-hidden />
                Flood monitoring changes ({data.series.length} series)
              </p>
              {data.series.length ? (
                data.series.map((s) => <SeriesCard key={`${s.seriesKey}-${s.current.id}`} s={s} />)
              ) : (
                <Card className="p-4 text-center text-[13px] text-muted-foreground sm:p-6 sm:text-body">
                  No AI-processed flood monitoring reports in this window.
                </Card>
              )}
            </div>

            <div className="min-w-0 space-y-2.5 sm:space-y-4">
              <OpsSection title="Latest AI report summaries" icon={Bot}>
                {data.latestAiSummaries.length ? (
                  <ul className="space-y-2 sm:space-y-3">
                    {data.latestAiSummaries.map((s) => (
                      <li key={s.id} className="border-l-2 border-primary/50 pl-3">
                        <p className="text-[12px] leading-snug text-foreground sm:text-body">{parseAiSummary(s.summary).overall}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          AI summary · {s.groupName ?? "Unnamed group"} · {formatShortDateTime(s.messageTime)} ·{" "}
                          <Link href={`${ROUTES.reports}/${s.id}`} className="font-mono text-primary hover:underline">
                            {s.reference}
                          </Link>
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-caption text-muted-foreground">AI summary is not available for reports in this window.</p>
                )}
              </OpsSection>
              <OpsSection title="Report sources" icon={Radio}>
                <CountBars items={data.bySource} />
                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">By group</p>
                  <CountBars items={data.byGroup} />
                </div>
              </OpsSection>
              <OpsSection title="Regional situation" icon={MapPinned}>
                <CountBars items={data.byRegion} emptyText="No reports in this period." />
                <p className="mt-2 text-[11px] text-muted-foreground">Regions as stated in the reports (AI-extracted); not inferred from place names.</p>
              </OpsSection>
              <OpsSection title="Report types" icon={Layers}>
                <CountBars items={data.byReportType} />
              </OpsSection>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
