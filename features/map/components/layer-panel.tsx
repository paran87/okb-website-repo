"use client";

import { Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useLayer } from "@/features/map/hooks/use-layer";
import { cn } from "@/utils/cn";

/** Layer visibility and opacity panel grouped by category. */
export function LayerPanel({ className }: { className?: string }) {
  const { layers, toggle, setOpacity } = useLayer();

  const grouped = layers.reduce<Record<string, typeof layers>>((acc, layer) => {
    const key = layer.category;
    acc[key] ??= [];
    acc[key]!.push(layer);
    return acc;
  }, {});

  return (
    <div className={cn("glass w-56 rounded-card shadow-panel", className)}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <Layers className="size-4 text-primary" aria-hidden />
        <span className="text-label font-medium text-foreground">Layers</span>
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto p-2">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <p className="mb-1 px-2 text-label uppercase tracking-wide text-muted-foreground">
              {category.replace(/-/g, " ")}
            </p>
            <ul className="space-y-1">
              {items.map((layer) => (
                <li
                  key={layer.id}
                  className="rounded-md px-2 py-1.5 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-caption text-foreground">
                      {layer.label}
                    </span>
                    <Switch
                      checked={layer.visible}
                      onCheckedChange={() => toggle(layer.id)}
                      aria-label={`Toggle ${layer.label}`}
                    />
                  </div>
                  {layer.visible ? (
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={layer.opacity}
                      onChange={(e) =>
                        setOpacity(layer.id, Number(e.target.value))
                      }
                      className="mt-1.5 h-1 w-full accent-primary"
                      aria-label={`${layer.label} opacity`}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Layer manager alias — orchestrates registry + panel. */
export function LayerManager({ className }: { className?: string }) {
  return <LayerPanel className={className} />;
}
