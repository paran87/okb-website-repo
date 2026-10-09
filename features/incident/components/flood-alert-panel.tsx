"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { PlacedLocation } from "@/features/incident/hooks/use-flood-situation";
import { FLOOD_SEVERITY } from "@/features/incident/lib/flood-severity";
import { formatDateTime, formatMeters, formatRelative, formatShortDateTime } from "@/features/reports/lib/format";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";

/** Where a flooded location is drawn on the map, in words. */
export function placeText(p: PlacedLocation): string {
  const r = p.resolved;
  if (r.basis === "intersection") {
    return `Shown where ${r.matched.join(" and ")} meet${r.places > 1 ? ` (${r.places} places have these road names)` : ""}`;
  }
  if (r.basis === "coordinates") return `Shown on ${r.matched.join(", ")} at the reported coordinates`;
  if (r.basis === "road") return `Shown along ${r.matched[0]}`;
  if (r.basis === "point") return "Shown at the reported coordinates";
  return "Not on the map: the road is not in the DPWH road network";
}

/** Details of the flooded location whose alert (or road) was tapped on the Incidents map. */
export function FloodAlertPanel({ placed, onClose, className }: { placed: PlacedLocation; onClose: () => void; className?: string }) {
  const l = placed.location;
  const meta = FLOOD_SEVERITY[l.severity];
  const depth = formatMeters(l.heightM);
  const area = [l.landmark, l.barangay, l.municipality, l.province].filter(Boolean).join(", ");
  const rows: [string, string | null][] = [
    ["Flood depth", depth ? `${l.heightApproximate ? "≈ " : ""}${depth}` : l.heightRaw || "Not given"],
    ["Road", l.roadStatus],
    ["Area", area || null],
    ["DEO", l.deo],
    ["Reported", `${formatDateTime(l.reportedAt)} (${formatRelative(l.reportedAt)})`],
    ["Clears", `${formatShortDateTime(l.clearsAt)}, unless reported again`],
    ["From", l.groupName],
    ["Reference", l.reference],
    ["On the map", placeText(placed)],
  ];
  return (
    <section
      aria-label={`Flood alert: ${l.label}`}
      className={cn("flex max-h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-caption shadow-panel", className)}
    >
      <header className="flex items-start gap-2 border-b border-border p-2.5 pr-1">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#e41b1b] text-[16px] font-black leading-none text-white" aria-hidden>
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-[11px] font-semibold uppercase tracking-wide">
            <span className="text-danger">Flood alert</span>
            <span className="inline-flex items-center gap-1" style={{ color: meta.color }}>
              <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
              {meta.label}
            </span>
          </p>
          <h3 className="break-words text-body font-semibold leading-snug text-foreground">{l.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the flood alert"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>
      <dl className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2.5">
        {rows
          .filter((r): r is [string, string] => Boolean(r[1]))
          .map(([k, v]) => (
            <div key={k} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="break-words text-foreground">{v}</dd>
            </div>
          ))}
      </dl>
      <footer className="border-t border-border px-2.5">
        <Link href={`${ROUTES.reports}/${l.reportId}`} className="inline-flex min-h-10 items-center font-semibold text-primary hover:underline">
          View report
        </Link>
      </footer>
    </section>
  );
}
