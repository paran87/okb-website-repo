"use client";

import { StatusIndicator } from "@/components/ui/status-indicator";
import { useMap } from "@/features/map/hooks/use-map";
import { cn } from "@/utils/cn";

/** Map engine status indicator overlay. */
export function MapStatusIndicator({ className }: { className?: string }) {
  const { status, isReady } = useMap();

  const tone =
    status === "ready"
      ? "online"
      : status === "loading"
        ? "warning"
        : status === "error"
          ? "danger"
          : "neutral";

  const label =
    status === "ready"
      ? "GIS Online"
      : status === "loading"
        ? "Loading"
        : status === "error"
          ? "Error"
          : "Idle";

  return (
    <div
      className={cn(
        "glass pointer-events-auto flex items-center gap-2 rounded-lg px-2.5 py-1.5 shadow-panel",
        className,
      )}
    >
      <StatusIndicator tone={tone} pulse={isReady} label={label} />
    </div>
  );
}
