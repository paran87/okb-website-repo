"use client";

import { cn } from "@/utils/cn";

export type MapMarkerTone =
  | "default"
  | "flood"
  | "critical"
  | "equipment"
  | "warning"
  | "offline";

const TONE_CLASSES: Record<MapMarkerTone, string> = {
  default: "bg-map-marker border-map-marker",
  flood: "bg-flood-moderate border-flood-moderate",
  critical: "bg-risk-severe border-risk-severe",
  equipment: "bg-equipment-deployed border-equipment-deployed",
  warning: "bg-warning border-warning",
  offline: "bg-equipment-offline border-equipment-offline",
};

interface MapMarkerProps {
  tone?: MapMarkerTone;
  pulse?: boolean;
  selected?: boolean;
  label?: string;
  className?: string;
}

/** DOM-based map marker pin (for HTML overlays on MapLibre). */
export function MapMarker({
  tone = "default",
  pulse = false,
  selected = false,
  label,
  className,
}: MapMarkerProps) {
  return (
    <div
      className={cn("relative flex flex-col items-center", className)}
      aria-label={label}
    >
      {pulse ? (
        <span
          className={cn(
            "absolute size-6 animate-ping rounded-full opacity-50",
            TONE_CLASSES[tone].split(" ")[0],
          )}
        />
      ) : null}
      <span
        className={cn(
          "relative size-4 rounded-full border-2 shadow-panel",
          TONE_CLASSES[tone],
          selected && "ring-2 ring-map-selection ring-offset-1 ring-offset-background",
        )}
      />
      {label ? (
        <span className="mt-0.5 whitespace-nowrap rounded bg-map-overlay px-1 py-0.5 text-map-label text-foreground">
          {label}
        </span>
      ) : null}
    </div>
  );
}
