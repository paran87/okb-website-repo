"use client";

import { Layers } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/utils/cn";

export interface MapLayer {
  id: string;
  label: string;
  visible: boolean;
  color?: string;
}

interface LayerSwitcherProps {
  layers: MapLayer[];
  onToggle: (id: string, visible: boolean) => void;
  className?: string;
}

/** Layer visibility toggle panel for GIS overlays. */
export function LayerSwitcher({
  layers,
  onToggle,
  className,
}: LayerSwitcherProps) {
  return (
    <div
      className={cn(
        "glass w-52 rounded-card shadow-panel",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Layers className="size-4 text-primary" aria-hidden />
        <span className="text-label text-muted-foreground">Layers</span>
      </div>
      <ul className="space-y-1 p-2">
        {layers.map((layer) => (
          <li
            key={layer.id}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
          >
            <span className="flex items-center gap-2 text-body text-foreground">
              {layer.color ? (
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
              ) : null}
              {layer.label}
            </span>
            <Switch
              checked={layer.visible}
              onCheckedChange={(v) => onToggle(layer.id, v)}
              aria-label={`Toggle ${layer.label} layer`}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Compact layer toggle button (opens LayerSwitcher in a parent panel). */
export function MapLayerToggle({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <IconButton
      icon={Layers}
      label="Toggle map layers"
      variant="outline"
      className={cn("glass shadow-panel", className)}
      onClick={onClick}
    />
  );
}
