"use client";

import type { ReactNode } from "react";
import { Compass } from "@/components/map/compass";
import { CoordinateDisplay } from "@/components/map/coordinate-display";
import { MapScale } from "@/components/map/map-scale";
import { ZoomControls } from "@/components/map/zoom-controls";
import { cn } from "@/utils/cn";

interface MapControlsProps {
  longitude: number;
  latitude: number;
  zoom?: number;
  bearing?: number;
  scaleLabel?: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
  extra?: ReactNode;
  className?: string;
}

/**
 * Composed map control cluster: zoom, compass, scale, coordinates.
 * Position this inside a relative map container via MapToolbar or absolute CSS.
 */
export function MapControls({
  longitude,
  latitude,
  zoom,
  bearing = 0,
  scaleLabel = "1 km",
  onZoomIn,
  onZoomOut,
  extra,
  className,
}: MapControlsProps) {
  return (
    <div className={cn("pointer-events-none flex flex-col gap-2", className)}>
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <Compass bearing={bearing} />
        <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
        {extra}
      </div>
      <div className="pointer-events-auto flex flex-wrap items-end gap-2">
        <MapScale label={scaleLabel} />
        <CoordinateDisplay
          longitude={longitude}
          latitude={latitude}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
