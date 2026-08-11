"use client";

import { cn } from "@/utils/cn";

interface MapScaleProps {
  /** Human-readable scale label, e.g. "500 m" or "2 km". */
  label: string;
  /** Pixel width of the scale bar. */
  widthPx?: number;
  className?: string;
}

/** Map scale bar overlay. */
export function MapScale({ label, widthPx = 80, className }: MapScaleProps) {
  return (
    <div
      className={cn("glass rounded-md px-2 py-1.5 shadow-panel", className)}
      aria-label={`Map scale: ${label}`}
    >
      <div
        className="mb-1 h-1 rounded-sm bg-foreground/80"
        style={{ width: widthPx }}
      />
      <p className="text-map-label text-muted-foreground">{label}</p>
    </div>
  );
}
