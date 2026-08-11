import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface MapOverlayProps {
  children: ReactNode;
  className?: string;
}

/** Absolute overlay slot for controls, popups, and HUD widgets over the map. */
export function MapOverlay({ children, className }: MapOverlayProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-10", className)}
    >
      {children}
    </div>
  );
}
