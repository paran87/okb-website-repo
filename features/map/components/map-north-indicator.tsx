"use client";

import { Compass } from "@/components/map/compass";
import { useMap } from "@/features/map/hooks/use-map";
import { cn } from "@/utils/cn";

interface MapNorthIndicatorProps {
  className?: string;
}

/** Compact north-up indicator for map corners (bearing-aware). */
export function MapNorthIndicator({ className }: MapNorthIndicatorProps) {
  const { viewport } = useMap();

  return (
    <Compass
      bearing={viewport.bearing ?? 0}
      className={cn("pointer-events-auto size-10 shadow-panel", className)}
    />
  );
}
