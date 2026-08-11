"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { usePopup } from "@/features/map/hooks/use-popup";
import { cn } from "@/utils/cn";

/** React popup overlay positioned from map click screen coordinates. */
export function MapPopupOverlay({ className }: { className?: string }) {
  const { popup, closePopup, isOpen } = usePopup();

  if (!isOpen || !popup.content || !popup.screenPoint) return null;

  const { content, screenPoint } = popup;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-40", className)}
    >
      <div
        role="dialog"
        aria-modal="false"
        className="glass pointer-events-auto absolute w-72 rounded-card shadow-xl"
        style={{
          left: Math.min(screenPoint.x, window.innerWidth - 300),
          top: Math.min(screenPoint.y - 10, window.innerHeight - 240),
          transform: "translate(-50%, -100%)",
        }}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2">
          <div>
            <h3 className="text-body font-semibold text-foreground">
              {content.title}
            </h3>
            {content.status ? (
              <p className="text-label text-muted-foreground">{content.status}</p>
            ) : null}
          </div>
          <IconButton
            icon={X}
            label="Close popup"
            variant="ghost"
            size="sm"
            onClick={closePopup}
          />
        </div>

        {content.description ? (
          <p className="px-3 py-2 text-caption text-muted-foreground">
            {content.description}
          </p>
        ) : null}

        {content.coordinates ? (
          <p className="px-3 font-mono text-label text-muted-foreground">
            {content.coordinates[1].toFixed(5)}°N{" "}
            {content.coordinates[0].toFixed(5)}°E
          </p>
        ) : null}

        {content.metadata && Object.keys(content.metadata).length > 0 ? (
          <dl className="space-y-1 px-3 py-2 text-label">
            {Object.entries(content.metadata).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{key}</dt>
                <dd className="font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {content.actions && content.actions.length > 0 ? (
          <div className="flex gap-2 border-t border-border/60 px-3 py-2">
            {content.actions.map((action) => (
              <Button
                key={action.id}
                size="sm"
                variant={action.variant ?? "ghost"}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
