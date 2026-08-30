"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, List } from "lucide-react";
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
  /** When true, the legend can be collapsed to a Show/Hide control. */
  collapsible?: boolean;
  defaultOpen?: boolean;
}

const SHAPE_CLASSES = {
  circle: "rounded-full size-3",
  square: "rounded-sm size-3",
  line: "h-0.5 w-5 rounded-full",
} as const;

/** Map symbology legend overlay with optional hide/show. */
export function MapLegend({
  title = "Legend",
  items,
  className,
  footer,
  collapsible = true,
  defaultOpen = true,
}: MapLegendProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (collapsible && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "glass pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-panel transition-colors hover:bg-muted/70",
          className,
        )}
        aria-expanded={false}
        aria-label="Show legend"
      >
        <List className="size-4 shrink-0" aria-hidden />
        Show legend
      </button>
    );
  }

  return (
    <div
      className={cn(
        "glass pointer-events-auto w-48 rounded-card shadow-panel",
        className,
      )}
      role="region"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
        <p className="text-label text-muted-foreground">{title}</p>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            aria-expanded={true}
            aria-label="Hide legend"
          >
            Hide
            <ChevronDown className="size-3" aria-hidden />
          </button>
        ) : null}
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
