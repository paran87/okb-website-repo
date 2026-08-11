"use client";

import { cn } from "@/utils/cn";

interface CoordinateDisplayProps {
  longitude: number;
  latitude: number;
  zoom?: number;
  className?: string;
}

/** Live coordinate readout (lng/lat/zoom). */
export function CoordinateDisplay({
  longitude,
  latitude,
  zoom,
  className,
}: CoordinateDisplayProps) {
  return (
    <div
      className={cn(
        "glass rounded-md px-2.5 py-1.5 font-mono text-map-label text-muted-foreground shadow-panel",
        className,
      )}
      aria-live="polite"
    >
      <span className="text-foreground">
        {latitude.toFixed(5)}°N {longitude.toFixed(5)}°E
      </span>
      {zoom !== undefined ? (
        <span className="ml-2 text-muted-foreground">Z{zoom.toFixed(1)}</span>
      ) : null}
    </div>
  );
}
