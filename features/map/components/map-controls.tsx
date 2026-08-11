"use client";

import {
  Compass,
  Copy,
  Maximize,
  Minimize,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { useMapContext } from "@/features/map/context/map-context";
import { useMap } from "@/features/map/hooks/use-map";
import { useCoordinates } from "@/features/map/hooks/use-coordinates";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { cn } from "@/utils/cn";

/** MapLibre control cluster: zoom, bearing, pitch, reset, fullscreen. */
export function GisMapControls({ className }: { className?: string }) {
  const { options } = useMapContext();
  const { map, viewport, scaleLabel, resetView } = useMap();
  const resetPreset = options.resetViewPreset ?? "ncr";
  const { formatted, copyCoordinates } = useCoordinates({ precision: 5 });
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  const zoomIn = () => map?.zoomIn({ duration: 250 });
  const zoomOut = () => map?.zoomOut({ duration: 250 });
  const resetBearing = () =>
    map?.easeTo({ bearing: 0, pitch: 0, duration: 400 });

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

        <div className="glass rounded-lg px-2.5 py-1.5 text-center shadow-panel">
          <p className="text-label text-muted-foreground">Zoom</p>
          <p className="font-mono text-caption font-medium text-foreground">
            {viewport.zoom.toFixed(1)}
          </p>
        </div>

        <div className="glass flex size-12 items-center justify-center rounded-full shadow-panel">
          <div
            className="relative size-8"
            style={{ transform: `rotate(${-(viewport.bearing ?? 0)}deg)` }}
          >
            <span className="absolute left-1/2 top-0 -translate-x-1/2 text-map-label font-bold text-danger">
              N
            </span>
            <Compass className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 text-primary" />
          </div>
        </div>

        <div className="glass rounded-lg px-2.5 py-1.5 text-center shadow-panel">
          <p className="text-label text-muted-foreground">Pitch</p>
          <p className="font-mono text-caption font-medium text-foreground">
            {Math.round(viewport.pitch ?? 0)}°
          </p>
        </div>

        <IconButton
          icon={RotateCcw}
          label="Reset view"
          variant="outline"
          size="sm"
          className="glass shadow-panel"
          onClick={() => resetView(resetPreset)}
        />

        <IconButton
          icon={RotateCcw}
          label="Reset bearing"
          variant="outline"
          size="sm"
          className="glass shadow-panel"
          onClick={resetBearing}
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
