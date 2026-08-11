import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface MapLayoutProps {
  /** Full-bleed map canvas (MapLibre container). */
  map: ReactNode;
  /** Overlays rendered inside the map container (controls, legend, panels). */
  overlays?: ReactNode;
  /** Side panel (situation feed, filters, details). */
  sidePanel?: ReactNode;
  sidePanelWidth?: "sm" | "md" | "lg";
  className?: string;
}

const SIDE_WIDTH = {
  sm: "w-72",
  md: "w-80",
  lg: "w-96",
} as const;

/**
 * Map-first layout: full-viewport map with optional side panel and floating
 * overlays. Designed for GIS command-center screens.
 */
export function MapLayout({
  map,
  overlays,
  sidePanel,
  sidePanelWidth = "md",
  className,
}: MapLayoutProps) {
  return (
    <div className={cn("flex h-full min-h-0 w-full", className)}>
      <div className="relative min-h-0 min-w-0 flex-1">
        {map}
        {overlays ? (
          <div className="pointer-events-none absolute inset-0 z-10">
            {overlays}
          </div>
        ) : null}
      </div>
      {sidePanel ? (
        <aside
          className={cn(
            "hidden shrink-0 flex-col overflow-y-auto border-l border-border bg-card lg:flex",
            SIDE_WIDTH[sidePanelWidth],
          )}
        >
          {sidePanel}
        </aside>
      ) : null}
    </div>
  );
}
