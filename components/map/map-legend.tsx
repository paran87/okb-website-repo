"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface MapLegendItem {
  id: string;
  label: string;
  color: string;
  shape?: "circle" | "square" | "line";
}

interface MapLegendProps {
  title?: string;
  items: MapLegendItem[];
  className?: string;
  footer?: ReactNode;
}

const SHAPE_CLASSES = {
  circle: "rounded-full size-3",
  square: "rounded-sm size-3",
  line: "h-0.5 w-5 rounded-full",
} as const;

/** Map symbology legend overlay. */
export function MapLegend({
  title = "Legend",
  items,
  className,
  footer,
}: MapLegendProps) {
  return (
    <div
      className={cn(
        "glass w-48 rounded-card shadow-panel",
        className,
      )}
    >
      <div className="border-b border-border/60 px-3 py-2 text-label text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-1.5 p-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2.5">
            <span
              className={cn("shrink-0", SHAPE_CLASSES[item.shape ?? "circle"])}
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span className="text-caption text-foreground">{item.label}</span>
          </li>
        ))}
      </ul>
      {footer ? (
        <div className="border-t border-border/60 px-3 py-2">{footer}</div>
      ) : null}
    </div>
  );
}
