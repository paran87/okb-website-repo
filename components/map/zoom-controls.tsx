"use client";

import { Plus, Minus } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/utils/cn";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  className?: string;
}

/** Map zoom in/out control cluster. */
export function ZoomControls({
  onZoomIn,
  onZoomOut,
  className,
}: ZoomControlsProps) {
  return (
    <div
      className={cn(
        "glass flex flex-col overflow-hidden rounded-lg shadow-panel",
        className,
      )}
    >
      <IconButton
        icon={Plus}
        label="Zoom in"
        variant="ghost"
        size="sm"
        onClick={onZoomIn}
        className="rounded-none border-b border-border/60"
      />
      <IconButton
        icon={Minus}
        label="Zoom out"
        variant="ghost"
        size="sm"
        onClick={onZoomOut}
        className="rounded-none"
      />
    </div>
  );
}
