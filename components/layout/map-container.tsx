import type { ReactNode } from "react";
import { Map } from "lucide-react";
import { cn } from "@/utils/cn";

interface MapContainerProps {
  children?: ReactNode;
  className?: string;
  /** Accessible label for the map workspace. */
  label?: string;
}

/**
 * GIS map workspace placeholder. Designed to host MapLibre in a later phase.
 * Full-bleed, maintains aspect ratio on smaller screens.
 */
export function MapContainer({
  children,
  className,
  label = "GIS map workspace",
}: MapContainerProps) {
  return (
    <div
      role="region"
      aria-label={label}
      className={cn(
        "relative h-full min-h-[420px] w-full overflow-hidden rounded-card border border-border bg-muted/20",
        className,
      )}
    >
      {children ?? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Map className="size-7" aria-hidden />
          </div>
          <div>
            <p className="text-subheading font-medium text-foreground">
              Map Workspace
            </p>
            <p className="mt-1 max-w-sm text-caption text-muted-foreground">
              Primary GIS situational awareness canvas. MapLibre integration
              lands in the flood monitoring phase.
            </p>
          </div>
          <div className="ops-grid absolute inset-0 -z-10 opacity-40" aria-hidden />
        </div>
      )}
    </div>
  );
}
