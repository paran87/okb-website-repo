"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CloudRain, GitCompareArrows, History, Link2, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import type { FloodMetrics, LocationChange, LocationChangeKind, SeriesComparison } from "@/features/reports/types";
import { formatClock, formatMeters, formatShortDateTime } from "@/features/reports/lib/format";
import { CHANGE_META } from "@/features/reports/lib/labels";
import { describeObservation } from "@/features/reports/lib/observations";
import { useLocationHistory } from "@/features/reports/hooks/use-reports";
import { ConditionBadge, MetricTile } from "@/features/reports/components/report-ui";
import { ROUTES } from "@/lib/constants";

const REPORT_ROUTE = `${ROUTES.reports}`;

function MetricsBlock({ title, metrics, time }: { title: string; metrics: FloodMetrics; time: string | null }) {
  const allClear = metrics.monitored > 0 && metrics.flooded === 0 && metrics.unknown === 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{formatShortDateTime(time)}</p>
      </div>
      <p className={cn("text-body font-semibold", allClear ? "text-success" : metrics.flooded ? "text-warning" : "text-foreground")}>
        {allClear
          ? `${metrics.monitored} / ${metrics.monitored} monitored locations · No active flooding`
          : `${metrics.flooded} of ${metrics.monitored} monitored locations with flooding`}
      </p>
      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-4">
        <MetricTile label="Flooded" value={metrics.flooded} tone={metrics.flooded ? "warning" : "muted"} />
        <MetricTile label="No flooding" value={metrics.noFlooding} tone={metrics.noFlooding ? "success" : "muted"} />
        <MetricTile label="Subsided" value={metrics.subsided} tone={metrics.subsided ? "success" : "muted"} sub="stated in report" />
        <MetricTile label="Not reported" value={metrics.unknown} tone="muted" />
      </div>
    </div>
  );
}

const GROUPS: { kinds: LocationChangeKind[]; title: string }[] = [
  { kinds: ["newly_flooded", "level_increased"], title: "Worsening" },
  { kinds: ["subsided", "level_decreased"], title: "Improving" },
  { kinds: ["still_flooded", "unchanged_flooded"], title: "Still flooded" },
  { kinds: ["new_location", "no_longer_listed"], title: "Listing changes" },
  { kinds: ["not_comparable"], title: "Not comparable (value not reported)" },
  { kinds: ["unchanged_clear"], title: "Unchanged — no flooding" },
];

function ChangeRow({ change, onHistory }: { change: LocationChange; onHistory?: (key: string) => void }) {
  const meta = CHANGE_META[change.kind];
  const subsidedAt = change.kind === "subsided" ? formatClock(change.current?.subsidedAt) : null;
  return (
    <li className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={meta.variant} className="font-mono">
          {meta.arrow} {meta.label}
        </Badge>
        <span className="font-semibold text-foreground">{change.label}</span>
        {subsidedAt ? <span className="text-caption text-success">Subsided: {subsidedAt}</span> : null}
        {onHistory ? (
          <button
            type="button"
            onClick={() => onHistory(change.key)}
            className="ml-auto inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline"
          >
            <History className="size-3.5" aria-hidden />
            History
          </button>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 text-caption @md:grid-cols-[1fr_auto_1fr] @md:items-center">
        <div className="rounded-md bg-card px-2.5 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Previous</p>
          <p className="text-foreground">{change.previous ? describeObservation(change.previous) : "Not listed"}</p>
          {change.previous?.roadStatus ? <p className="text-muted-foreground">Road: {change.previous.roadStatus}</p> : null}
        </div>
        <ArrowRight className="hidden size-4 text-muted-foreground @md:block" aria-hidden />
        <div className="rounded-md bg-card px-2.5 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current</p>
          <p className="text-foreground">{change.current ? describeObservation(change.current) : "Not listed"}</p>
          {change.current?.roadStatus ? <p className="text-muted-foreground">Road: {change.current.roadStatus}</p> : null}
        </div>
      </div>
      <p className="mt-2 text-caption text-muted-foreground">{change.detail}</p>
      {change.roadChange ? (
        <p className="mt-1 text-caption">
          <span className="font-semibold text-foreground">Road passability changed:</span> “{change.roadChange.from}” → “
          {change.roadChange.to}”
        </p>
      ) : null}
      {change.interventionChange ? (
        <p className="mt-1 text-caption">
          <span className="font-semibold text-foreground">Personnel / response changed:</span> “{change.interventionChange.from}”
          → “{change.interventionChange.to}”
        </p>
      ) : null}
    </li>
  );
}

/** Previous-vs-current comparison for one monitoring series. */
export function SeriesChangePanel({
  comparison,
  onLocationHistory,
  compact = false,
}: {
  comparison: SeriesComparison;
  onLocationHistory?: (key: string) => void;
  compact?: boolean;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(!compact);
  const c = comparison;

  return (
    <div className="@container space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <GitCompareArrows className="size-4 text-primary" aria-hidden />
        <p className="font-semibold text-foreground">{c.seriesLabel}</p>
        <Badge variant="outline">
          {c.members.length} report{c.members.length === 1 ? "" : "s"} in series
        </Badge>
        {c.evidence.length ? (
          <button
            type="button"
            onClick={() => setShowEvidence((v) => !v)}
            className="inline-flex items-center gap-1 text-caption font-semibold text-primary hover:underline"
            aria-expanded={showEvidence}
          >
            <Link2 className="size-3.5" aria-hidden />
            Why are these reports linked?
          </button>
        ) : null}
      </div>
      {showEvidence ? (
        <ul className="list-inside list-disc rounded-lg border border-border bg-muted/20 px-3 py-2 text-caption text-muted-foreground">
          {c.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
          <li>Original reports remain separate records; the series is a computed relationship.</li>
        </ul>
      ) : null}

      <div className={cn("grid gap-4", c.previous ? "@4xl:grid-cols-2" : "")}>
        <MetricsBlock title="Current status" metrics={c.current.metrics} time={c.current.messageTime} />
        {c.previous ? <MetricsBlock title="Previous status" metrics={c.previous.metrics} time={c.previous.messageTime} /> : null}
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Situation change · system-computed from AI-extracted values
        </p>
        <p className="mt-0.5 text-body text-foreground">{c.computedSummary}</p>
      </div>

      {c.weather.previous || c.weather.current ? (
        <div className="flex flex-wrap items-center gap-2 text-caption">
          <CloudRain className="size-4 text-primary" aria-hidden />
          <span className="font-semibold uppercase tracking-wider text-muted-foreground">Weather</span>
          {c.previous ? (
            <>
              <span className="text-foreground">{c.weather.previous?.text ?? "Not reported"}</span>
              <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
            </>
          ) : null}
          <span className="font-semibold text-foreground">{c.weather.current?.text ?? "Not reported"}</span>
          {c.weather.changed === true ? <Badge variant="info">Changed</Badge> : null}
          {c.weather.changed === false ? <Badge>Unchanged</Badge> : null}
          {c.previous && c.weather.changed === null ? <span className="text-muted-foreground">(not comparable)</span> : null}
        </div>
      ) : null}

      {c.previous ? (
        <div className="space-y-3">
          {GROUPS.map((g) => {
            const rows = c.changes.filter((ch) => g.kinds.includes(ch.kind));
            if (!rows.length) return null;
            const collapsible = g.kinds.includes("unchanged_clear");
            if (collapsible && !showUnchanged) {
              return (
                <button
                  key={g.title}
                  type="button"
                  onClick={() => setShowUnchanged(true)}
                  className="text-caption font-semibold text-primary hover:underline"
                >
                  Show {rows.length} unchanged location{rows.length === 1 ? "" : "s"} (no flooding)
                </button>
              );
            }
            return (
              <div key={g.title} className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {g.title} ({rows.length})
                </p>
                <ul className="space-y-2">
                  {rows.map((ch) => (
                    <ChangeRow key={ch.key} change={ch} onHistory={onLocationHistory} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-caption text-muted-foreground">
          No earlier report in this series to compare with. Changes appear when the next update from the same office and
          locations arrives.
        </p>
      )}

      {c.members.length > 1 ? (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <ListChecks className="size-3.5" aria-hidden />
            Reports in this series
          </p>
          <ol className="flex flex-wrap gap-2">
            {c.members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`${REPORT_ROUTE}/${m.id}`}
                  className={cn(
                    "inline-flex flex-col rounded-md border px-2.5 py-1 text-caption hover:border-primary/60",
                    m.isCurrent ? "border-primary/60 bg-primary/10" : "border-border bg-card",
                  )}
                >
                  <span className="font-mono text-[11px] text-muted-foreground">{m.reference}</span>
                  <span className="text-foreground">
                    {formatShortDateTime(m.messageTime)}
                    {m.isCurrent ? " · this report" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/** Drawer listing one location's observations across the series, oldest first. */
export function LocationHistoryDrawer({
  reportId,
  locationKey,
  onClose,
}: {
  reportId: string;
  locationKey: string | null;
  onClose: () => void;
}) {
  const history = useLocationHistory(reportId, locationKey);
  const entries = history.data?.entries ?? [];
  const latest = entries[entries.length - 1];
  const previous = entries[entries.length - 2];

  return (
    <Drawer open={Boolean(locationKey)} onClose={onClose} title="Monitoring location history" className="max-w-[32rem]">
      {history.isPending ? (
        <SkeletonText lines={6} />
      ) : history.isError ? (
        <ErrorState title="History unavailable" description={history.error.message} onRetry={() => history.refetch()} />
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-subheading text-foreground">{history.data?.label}</p>
            {history.data?.seriesLabel ? <p className="text-caption text-muted-foreground">{history.data.seriesLabel}</p> : null}
          </div>
          {latest ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current</p>
                <ConditionBadge condition={latest.observation.condition} className="mt-1" />
                <p className="mt-1 text-caption text-foreground">{describeObservation(latest.observation)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Previous</p>
                {previous ? (
                  <>
                    <ConditionBadge condition={previous.observation.condition} className="mt-1" />
                    <p className="mt-1 text-caption text-foreground">{describeObservation(previous.observation)}</p>
                    {previous.observation.roadStatus ? (
                      <p className="text-caption text-muted-foreground">{previous.observation.roadStatus}</p>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-1 text-caption text-muted-foreground">No earlier observation</p>
                )}
              </div>
            </div>
          ) : null}
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Timeline</p>
            <ol className="relative space-y-4 border-l border-border pl-5">
              {entries.map((e) => {
                const o = e.observation;
                const subsided = formatClock(o.subsidedAt);
                return (
                  <li key={e.reportId} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[26px] top-1 size-3 rounded-full border-2 border-card",
                        o.condition === "flooded" || o.condition === "flooding_reported_unmeasured"
                          ? "bg-warning"
                          : o.condition === "unknown"
                            ? "bg-muted-foreground"
                            : "bg-success",
                      )}
                      aria-hidden
                    />
                    <p className="font-mono text-caption text-muted-foreground">{formatShortDateTime(e.messageTime)}</p>
                    {subsided ? (
                      <p className="text-caption text-success">Flooding subsided as of {subsided} (time stated in this report)</p>
                    ) : null}
                    <p className="text-body font-semibold text-foreground">
                      {o.condition === "flooded"
                        ? `Water level: ${formatMeters(o.heightM)}`
                        : o.condition === "subsided"
                          ? "No flooding"
                          : describeObservation(o)}
                    </p>
                    {o.roadStatus ? <p className="text-caption text-muted-foreground">Road: {o.roadStatus}</p> : null}
                    {o.intervention ? <p className="text-caption text-muted-foreground">Personnel / action: {o.intervention}</p> : null}
                    <Link href={`${REPORT_ROUTE}/${e.reportId}`} className="text-[11px] font-mono text-primary hover:underline">
                      {e.reference}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Built from the original reports in this monitoring series. Each observation stays attached to its own report;
            nothing is overwritten.
          </p>
        </div>
      )}
    </Drawer>
  );
}
