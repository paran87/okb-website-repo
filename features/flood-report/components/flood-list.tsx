"use client";

import { MessageSquareText, X } from "lucide-react";
import { formatRelative } from "@/features/reports/lib/format";
import { cn } from "@/utils/cn";
import { formatDepth } from "../lib/options";
import type { PublicFloodReport } from "../types";
import { reportColor } from "./flood-map";

/** The depth (or state) tag a report shows under its pin. */
function tagOf(r: PublicFloodReport): string {
  return r.receded ? "Receded" : r.expired ? "Cleared" : r.depthM !== null ? formatDepth(r.depthM) : "Flood";
}

/**
 * The flooded areas on the map as a list, over the bottom of the map (the map stays visible and usable above it).
 * Tapping a row opens that report and flies the map to it.
 */
export function FloodList({
  open,
  reports,
  history,
  loading,
  onPick,
  onClose,
  className,
}: {
  open: boolean;
  reports: PublicFloodReport[];
  /** A history range (24h, 3d, 7d) is selected: receded and cleared reports are listed too. */
  history: boolean;
  loading: boolean;
  onPick: (id: string) => void;
  onClose: () => void;
  className?: string;
}) {
  if (!open) return null;
  const sorted = [...reports].sort((a, b) => Number(b.active) - Number(a.active) || Date.parse(b.reportedAt) - Date.parse(a.reportedAt));
  const flooded = reports.filter((r) => r.active).length;
  return (
    <section
      aria-label="Flooded areas"
      className={cn("pointer-events-auto flex max-h-[46dvh] flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl", className)}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 py-1 pl-3.5 pr-1.5">
        <h2 className="min-w-0 truncate text-[15px] font-bold">
          {history ? `Reports (${reports.length})` : `Flooded areas (${flooded})`}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Hide the list"
          className="flex size-10 shrink-0 items-center justify-center rounded-full text-slate-600 active:bg-slate-100"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {sorted.length === 0 ? (
          <p className="px-3.5 py-4 text-sm text-slate-600">
            {loading ? "Loading reports…" : history ? "No flood reports in this time range." : "No flooding reported right now."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sorted.map((r) => {
              const color = reportColor(r);
              const thumb = r.photos[0]?.url ?? r.videos.find((v) => v.posterUrl)?.posterUrl ?? null;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => onPick(r.id)}
                    className={cn("flex min-h-14 w-full items-center gap-3 px-3.5 py-2 text-left active:bg-slate-100", !r.active && "opacity-70")}
                  >
                    <span
                      className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] bg-slate-100 bg-cover bg-center"
                      style={{ borderColor: color, backgroundImage: thumb ? `url("${thumb}")` : undefined }}
                      aria-hidden
                    >
                      {thumb ? null : <MessageSquareText className="size-4 text-slate-500" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-tight">{r.locationText}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {[r.area, formatRelative(r.reportedAt)].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold leading-4 text-white"
                      style={{ background: color }}
                    >
                      {tagOf(r)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
