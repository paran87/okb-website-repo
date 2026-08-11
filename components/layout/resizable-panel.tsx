"use client";

import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/utils/cn";

interface ResizablePanelProps {
  left: ReactNode;
  right: ReactNode;
  defaultLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
  className?: string;
}

/**
 * Drag-to-resize two-pane layout. Pointer-driven splitter for map + detail
 * views common in command-center UIs.
 */
export function ResizablePanel({
  left,
  right,
  defaultLeftPercent = 40,
  minLeftPercent = 20,
  maxLeftPercent = 80,
  className,
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
  const dragging = useRef(false);

  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((event.clientX - rect.left) / rect.width) * 100;
      setLeftPercent(
        Math.min(maxLeftPercent, Math.max(minLeftPercent, pct)),
      );
    },
    [minLeftPercent, maxLeftPercent],
  );

  const onPointerUp = useCallback((event: ReactPointerEvent) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-0 flex-1 flex-col lg:flex-row",
        className,
      )}
    >
      <div
        className="min-h-0 min-w-0 overflow-auto"
        style={{ flex: `0 0 ${leftPercent}%` }}
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={Math.round(leftPercent)}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="hidden w-1.5 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-primary/40 active:bg-primary lg:block"
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-auto">{right}</div>
    </div>
  );
}
