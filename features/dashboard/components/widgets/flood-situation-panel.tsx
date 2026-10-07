import type { ReactNode } from "react";
import Link from "next/link";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import type { PlacedLocation } from "@/features/incident/hooks/use-flood-situation";
import { FLOOD_SEVERITY } from "@/features/incident/lib/flood-severity";
import type { FloodMapData } from "@/features/incident/types";
import { formatMeters, formatRelative } from "@/features/reports/lib/format";
import { ROUTES } from "@/lib/constants";

interface FloodSituationPanelProps {
  icon: ReactNode;
  placed: PlacedLocation[];
  data: FloodMapData | undefined;
  ready: boolean;
  className?: string;
}

/** Flooded places from the received reports right now, most severe first (replaces the static "Top Cities"). */
export function FloodSituationPanel({ icon, placed, data, ready, className }: FloodSituationPanelProps) {
  const cleared = (data?.clearedByReport ?? 0) + (data?.clearedByWeather ?? 0);
  return (
    <WidgetContainer
      title="Current Situation"
      subtitle="Flooded places from the latest reports"
      icon={icon}
      className={className}
      compact
      bodyClassName="min-h-0 flex-1 space-y-1.5 overflow-y-auto"
    >
      {!ready ? (
        <p className="text-[11px] text-muted-foreground">Loading reports…</p>
      ) : placed.length === 0 ? (
        <p className="text-[11px] text-success">No flooded roads reported — normal conditions.</p>
      ) : (
        placed.slice(0, 8).map(({ location: l }) => {
          const meta = FLOOD_SEVERITY[l.severity];
          return (
            <Link
              key={l.key}
              href={ROUTES.incidents}
              className="block min-h-10 rounded-md px-1 py-1 text-[11px] leading-tight hover:bg-muted/50"
            >
              <span className="flex items-baseline justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
                  <span className="truncate font-medium text-foreground">{l.label}</span>
                </span>
                <span className="shrink-0 font-mono text-foreground">{formatMeters(l.heightM) ?? "—"}</span>
              </span>
              <span className="block truncate pl-3.5 text-[10px] text-muted-foreground">
                {meta.label} · {formatRelative(l.reportedAt)}
                {l.roadStatus ? ` · ${l.roadStatus}` : ""}
              </span>
            </Link>
          );
        })
      )}
      {ready && placed.length > 8 ? (
        <Link href={ROUTES.incidents} className="flex min-h-10 items-center px-1 text-[11px] font-semibold text-primary hover:underline">
          +{placed.length - 8} more in Incidents
        </Link>
      ) : null}
      {ready && cleared > 0 ? (
        <p className="px-1 text-[10px] text-muted-foreground">
          {cleared} place{cleared === 1 ? "" : "s"} back to normal in the last 24 h
        </p>
      ) : null}
    </WidgetContainer>
  );
}
