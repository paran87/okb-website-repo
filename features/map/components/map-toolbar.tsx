"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface MapToolbarProps {
  children: ReactNode;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  className?: string;
}

const POSITION: Record<NonNullable<MapToolbarProps["position"]>, string> = {
  "top-left": "top-3 left-3",
  "top-right": "top-3 right-3",
  "bottom-left": "bottom-3 left-3",
  "bottom-right": "bottom-3 right-3",
};

/** Floating GIS toolbar positioned over the map canvas. */
export function GisMapToolbar({
  children,
  position = "top-right",
  className,
}: MapToolbarProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 flex items-center gap-1.5",
        POSITION[position],
        className,
      )}
      role="toolbar"
      aria-label="Map tools"
    >
      {children}
    </div>
  );
}
