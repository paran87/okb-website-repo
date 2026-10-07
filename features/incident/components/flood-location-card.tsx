"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { FLOOD_SEVERITY } from "@/features/incident/lib/flood-severity";
import type { FloodMapLocation } from "@/features/incident/types";
import { formatMeters, formatRelative } from "@/features/reports/lib/format";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";

/** Details of a flooded road tapped on a map (Dashboard, Flood Monitoring overview). */
export function FloodLocationCard({
  location,
  onClose,
  className,
}: {
  location: FloodMapLocation;
  onClose: () => void;
  className?: string;
}) {
  const meta = FLOOD_SEVERITY[location.severity];
  return (
    <div className={cn("glass rounded-lg p-2.5 text-[11px] shadow-panel", className)}>
      <div className="flex items-start gap-2">
        <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">
            {meta.label}
            {location.heightM !== null ? ` · ${formatMeters(location.heightM)}` : ""}
            <span className="font-normal text-muted-foreground"> · {formatRelative(location.reportedAt)}</span>
          </p>
          <p className="break-words text-foreground">{location.label}</p>
          {location.roadStatus ? <p className="break-words text-muted-foreground">Road: {location.roadStatus}</p> : null}
          <Link href={ROUTES.incidents} className="mt-1 inline-flex min-h-10 items-center font-semibold text-primary hover:underline">
            Open in Incidents
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-m-1 flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
