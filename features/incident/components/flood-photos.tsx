"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import type { ReportPhoto } from "@/features/reports/types";
import { PhotoViewer } from "@/features/flood-report/components/report-details";
import { cn } from "@/utils/cn";

/**
 * Geotagged photos of a flooded location (reports sent from the OKB mobile page). Tapping one opens the
 * full-screen viewer (swipe or arrows between photos).
 */
export function FloodPhotos({
  photos,
  label,
  size = "md",
  max,
  className,
}: {
  photos: ReportPhoto[];
  /** Place name, for the photos' alt text. */
  label: string;
  size?: "sm" | "md";
  /** Show at most this many thumbnails; the last one says how many more there are. */
  max?: number;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (!photos.length) return null;
  const shown = max ? photos.slice(0, max) : photos;
  const more = photos.length - shown.length;
  const viewer = photos.map((p, i) => ({ url: p.url, alt: `Flood photo ${i + 1} at ${label}` }));
  return (
    <>
      <div className={cn("flex gap-1.5 overflow-x-auto [scrollbar-width:thin]", className)} aria-label={`${photos.length} geotagged photo${photos.length === 1 ? "" : "s"}`}>
        {shown.map((p, i) => (
          <button
            key={p.key}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(i);
            }}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border",
              size === "sm" ? "h-10 w-14" : "h-16 w-24",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- streamed from R2 through /api/flood-reports/photo */}
            <img src={p.url} alt="" loading="lazy" className="size-full object-cover" />
            {more > 0 && i === shown.length - 1 ? (
              <span className="absolute inset-0 grid place-items-center bg-black/55 text-[12px] font-bold text-white">+{more}</span>
            ) : null}
          </button>
        ))}
      </div>
      <PhotoViewer photos={viewer} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </>
  );
}

/** "📷 3" marker for lists too narrow for thumbnails. */
export function PhotoCount({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-primary", className)} aria-label={`${count} photos`}>
      <Camera className="size-3.5" aria-hidden />
      {count}
    </span>
  );
}
