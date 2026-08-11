"use client";

import { Globe2, Layers, Map, Mountain, Satellite } from "lucide-react";
import {
  getBasemapLabel,
  PUBLIC_BASEMAP_STYLES,
} from "@/features/map/config/map-styles";
import { useMap } from "@/features/map/hooks/use-map";
import type { MapStyleId } from "@/features/map/types";
import { cn } from "@/utils/cn";

const STYLE_ICONS: Partial<Record<MapStyleId, typeof Map>> = {
  light: Map,
  satellite: Satellite,
  terrain: Mountain,
  dark: Layers,
};

interface MapBasemapSwitcherProps {
  styles?: readonly MapStyleId[];
  className?: string;
}

/** Google Maps–style basemap picker (Map / Satellite / Terrain). */
export function MapBasemapSwitcher({
  styles = PUBLIC_BASEMAP_STYLES,
  className,
}: MapBasemapSwitcherProps) {
  const { styleId, setStyle, isReady } = useMap();

  if (!isReady) return null;

  return (
    <div
      className={cn(
        "glass pointer-events-auto flex flex-col gap-1 rounded-lg p-1 shadow-panel",
        className,
      )}
      role="group"
      aria-label="Map type"
    >
      <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Globe2 className="size-3" aria-hidden />
        Philippines
      </div>
      {styles.map((id) => {
        const Icon = STYLE_ICONS[id] ?? Map;
        const active = styleId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setStyle(id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted/70",
            )}
            aria-pressed={active}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {getBasemapLabel(id)}
          </button>
        );
      })}
    </div>
  );
}
