"use client";

import { MapLegend } from "@/components/map/map-legend";
import { useLayer } from "@/features/map/hooks/use-layer";
import { cn } from "@/utils/cn";

/** Auto-generated legend from visible layer registry entries. */
export function GisLegend({ className }: { className?: string }) {
  const { legend } = useLayer();

  if (legend.length === 0) return null;

  return (
    <MapLegend
      title="Operational Legend"
      items={legend.map((item) => ({
        id: item.id,
        label: item.label,
        color: item.color,
        shape: item.shape,
      }))}
      collapsible
      defaultOpen
      className={cn("pointer-events-auto", className)}
    />
  );
}
