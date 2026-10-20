"use client";

import { useState } from "react";
import { Camera, Play } from "lucide-react";
import type { ReportPhoto, ReportVideo } from "@/features/reports/types";
import { PhotoViewer, type ViewerItem } from "@/features/flood-report/components/report-details";
import { cn } from "@/utils/cn";

/**
 * Photos and videos of a flooded location (geotagged photos sent from the OKB mobile page, and media OKB
 * operators added). Tapping one opens the full-screen viewer (swipe or arrows between them).
 */
export function FloodPhotos({
  photos,
  videos = [],
  label,
  size = "md",
  max,
  className,
}: {
  photos: ReportPhoto[];
  videos?: ReportVideo[];
  /** Place name, for the photos' alt text. */
  label: string;
  size?: "sm" | "md";
  /** Show at most this many thumbnails; the last one says how many more there are. */
  max?: number;
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const viewer: ViewerItem[] = [
    ...photos.map((p, i) => ({ url: p.url, alt: `Flood photo ${i + 1} at ${label}` })),
    ...videos.map((v, i) => ({ url: v.url, alt: `Flood video ${i + 1} at ${label}`, video: true, poster: v.posterUrl ?? undefined })),
  ];
  if (!viewer.length) return null;
  const shown = max ? viewer.slice(0, max) : viewer;
  const more = viewer.length - shown.length;
  return (
    <>
      <div className={cn("flex gap-1.5 overflow-x-auto [scrollbar-width:thin]", className)} aria-label={`${viewer.length} photo${viewer.length === 1 ? "" : "s"} and video${viewer.length === 1 ? "" : "s"}`}>
        {shown.map((p, i) => (
          <button
            key={p.url}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(i);
            }}
            aria-label={`Open ${p.video ? "video" : "photo"} ${i + 1} of ${viewer.length}`}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border",
              size === "sm" ? "h-10 w-14" : "h-16 w-24",
            )}
          >
            {p.video ? (
              <>
                <video src={`${p.url}#t=0.1`} poster={p.poster} preload="metadata" muted playsInline className="pointer-events-none size-full object-cover" />
                <span className="absolute inset-0 grid place-items-center">
                  <Play className="size-5 rounded-full bg-black/60 p-1 text-white" aria-hidden />
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- streamed from R2 through our own routes
              <img src={p.url} alt="" loading="lazy" className="size-full object-cover" />
            )}
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
