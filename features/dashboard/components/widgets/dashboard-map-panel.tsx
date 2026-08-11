"use client";

import { MapEngine } from "@/features/map/components/map-engine";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import { cn } from "@/utils/cn";

interface DashboardMapPanelProps {
  className?: string;
}

/** Dashboard-embedded GIS map powered by the MapEngine. */
export function DashboardMapPanel({ className }: DashboardMapPanelProps) {
  return (
    <div
      className={cn(
        "h-full min-h-[280px] overflow-hidden rounded-card border border-border",
        className,
      )}
    >
      <MapEngine
        initialView={NCR_MAP_VIEW}
        showSearch={false}
        className="h-full min-h-[280px] lg:min-h-[400px]"
      />
    </div>
  );
}
