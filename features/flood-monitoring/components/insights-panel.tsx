"use client";

import { Building2, Layers } from "lucide-react";
import type { NcrBreakdownRow } from "@/features/dashboard/lib/ncr-summary";
import type { FloodwatchCount } from "@/features/floodwatch/types";
import { cn } from "@/utils/cn";

type Row = Pick<NcrBreakdownRow, "label" | "count">;

function RankedBars({
  rows,
  color,
  emptyLabel,
}: {
  rows: readonly Row[];
  color: string;
  emptyLabel: string;
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  if (rows.length === 0) {
    return <p className="text-[11px] text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-1.5">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-2 text-[11px] leading-tight">
            <span className="min-w-0 truncate text-foreground">{row.label}</span>
            <span className="shrink-0 font-mono font-medium text-foreground">
              {row.count.toLocaleString()}
            </span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${(row.count / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface InsightsPanelProps {
  byDeo: readonly Row[];
  byRegion: readonly FloodwatchCount[];
  regionsLoading: boolean;
  className?: string;
}

/** Ranked breakdowns of both datasets, shown beside the map. */
export function InsightsPanel({
  byDeo,
  byRegion,
  regionsLoading,
  className,
}: InsightsPanelProps) {
  return (
    <aside
      aria-label="Flood monitoring insights"
      className={cn(
        "glass pointer-events-auto flex min-h-0 flex-col divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 shadow-panel",
        className,
      )}
    >
      <section className="min-h-0 flex-1 overflow-y-auto p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Building2 className="size-3.5 text-danger" aria-hidden />
          Incidents by District Office
        </h3>
        <RankedBars rows={byDeo.slice(0, 8)} color="#dc2626" emptyLabel="No data" />
      </section>
      <section className="min-h-0 flex-1 overflow-y-auto p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Layers className="size-3.5 text-[#7c3aed]" aria-hidden />
          Flood-Prone Areas by Region
        </h3>
        <RankedBars
          rows={byRegion.slice(0, 8)}
          color="#7c3aed"
          emptyLabel={regionsLoading ? "Loading Floodwatch…" : "Floodwatch unavailable"}
        />
      </section>
      <footer className="px-3 py-2 text-[10px] leading-snug text-muted-foreground">
        Sources: NCR Critical Areas (DEOS 2026) · Floodwatch national list
      </footer>
    </aside>
  );
}
