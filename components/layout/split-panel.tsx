"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface SplitPanelProps {
  left: ReactNode;
  right: ReactNode;
  /** Initial left panel width percentage (10–90). */
  defaultLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
  className?: string;
}

/**
 * Two-pane split layout. On mobile stacks vertically; on desktop shows
 * side-by-side panels with a fixed ratio (non-resizable — use ResizablePanel
 * for drag-to-resize).
 */
export function SplitPanel({
  left,
  right,
  defaultLeftPercent = 50,
  className,
}: SplitPanelProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-0",
        className,
      )}
    >
      <div
        className="min-h-0 min-w-0 lg:overflow-auto lg:border-r lg:border-border"
        style={{ flex: `0 0 ${defaultLeftPercent}%` }}
      >
        {left}
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{right}</div>
    </div>
  );
}
