"use client";

import { RotateCcw, Maximize, Minimize, ZoomIn, ZoomOut, Copy } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { MapNorthIndicator } from "@/features/map/components/map-north-indicator";
import { useMapContext } from "@/features/map/context/map-context";
import { useMap } from "@/features/map/hooks/use-map";
import { useCoordinates } from "@/features/map/hooks/use-coordinates";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { cn } from "@/utils/cn";

/** Map control cluster: zoom, north, reset view, fullscreen, scale, coordinates. */
export function GisMapControls({ className }: { className?: string }) {
  const { options } = useMapContext();
  const showNorthInControls = options.showNorthInControls ?? true;
  const { map, scaleLabel, resetView } = useMap();
  const resetPreset = options.resetViewPreset ?? "ncr";
  const { formatted, copyCoordinates } = useCoordinates({ precision: 5 });
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  const zoomIn = () => map?.zoomIn({ duration: 250 });
  const zoomOut = () => map?.zoomOut({ duration: 250 });

  return (
    <div className={cn("pointer-events-none flex flex-col gap-2", className)}>
      <div className="pointer-events-auto flex flex-col items-end gap-1.5">
        <div className="glass flex flex-col overflow-hidden rounded-lg shadow-panel">
          <IconButton
            icon={ZoomIn}
            label="Zoom in"
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            className="rounded-none border-b border-border/60"
          />
          <IconButton
            icon={ZoomOut}
            label="Zoom out"
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            className="rounded-none"
          />
        </div>

        {showNorthInControls ? (
          <MapNorthIndicator />
        ) : null}

        <IconButton
          icon={RotateCcw}
          label="Reset view"
          variant="outline"
          size="sm"
          className="glass shadow-panel"
          onClick={() => resetView(resetPreset)}
        />

        <IconButton
          icon={isFullscreen ? Minimize : Maximize}
          label="Toggle fullscreen"
          variant="outline"
          size="sm"
          className="glass shadow-panel"
          onClick={toggleFullscreen}
        />
      </div>

      <div className="pointer-events-auto flex flex-wrap items-end gap-2">
        <div className="glass rounded-md px-2.5 py-1.5 shadow-panel">
          <div
            className="mb-1 h-1 rounded-sm bg-foreground/80"
            style={{ width: 80 }}
          />
          <p className="text-map-label text-muted-foreground">{scaleLabel}</p>
        </div>

        {formatted ? (
          <button
            type="button"
            onClick={() => void copyCoordinates()}
            className="glass flex items-center gap-2 rounded-md px-2.5 py-1.5 font-mono text-map-label shadow-panel transition-colors hover:text-foreground"
            title="Copy coordinates"
          >
            <span className="text-foreground">{formatted.decimal}</span>
            <Copy className="size-3 text-muted-foreground" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
