import { Layers } from "lucide-react";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import type { FloodZoneRow } from "@/features/dashboard/lib/flood-zones-summary";

/** Flood-prone zones from the Overview map, in the zone color (violet). */
export function FloodZonesPanel({
  zones,
  className,
}: {
  zones: readonly FloodZoneRow[];
  className?: string;
}) {
  return (
    <WidgetContainer
      title="Flood-Prone Zones"
      subtitle={`${zones.filter((z) => z.floodProne).length} of ${zones.length} flood-prone`}
      icon={<Layers className="size-4" aria-hidden />}
      className={className}
      compact
      bodyClassName="min-h-0 flex-1 space-y-1 overflow-y-auto"
    >
      {zones.map((zone) => (
        <div
          key={zone.id}
          className="flex items-center gap-1.5 text-[11px] leading-tight"
        >
          <span
            className="size-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: zone.floodProne ? "#7c3aed" : "#22c55e" }}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate text-foreground">
            {zone.title}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {zone.floodProne ? "Flood-prone" : "Normal"}
          </span>
        </div>
      ))}
    </WidgetContainer>
  );
}
