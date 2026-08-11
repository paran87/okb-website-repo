"use client";

import type { ReactNode } from "react";
import { Filter } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/utils/cn";

interface MapFilterProps {
  children: ReactNode;
  open?: boolean;
  onToggle?: () => void;
  title?: string;
  className?: string;
}

/** Collapsible map filter panel with toggle button. */
export function MapFilter({
  children,
  open = false,
  onToggle,
  title = "Filters",
  className,
}: MapFilterProps) {
  return (
    <div className={cn("pointer-events-auto", className)}>
      <IconButton
        icon={Filter}
        label="Toggle map filters"
        variant="outline"
        className="glass shadow-panel"
        onClick={onToggle}
      />
      {open ? (
        <div className="glass mt-2 w-56 rounded-card shadow-panel">
          <div className="border-b border-border/60 px-3 py-2 text-label text-muted-foreground">
            {title}
          </div>
          <div className="space-y-3 p-3">{children}</div>
        </div>
      ) : null}
    </div>
  );
}
