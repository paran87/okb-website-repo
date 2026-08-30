"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { usePopup } from "@/features/map/hooks/use-popup";
import { popupService } from "@/features/map/services/popup.service";
import type { PopupPlacement } from "@/features/map/services/popup.service";
import { cn } from "@/utils/cn";

/** React popup overlay positioned from map click screen coordinates. */
export function MapPopupOverlay({ className }: { className?: string }) {
  const { popup, closePopup, isOpen } = usePopup();
  const boundsRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<PopupPlacement | null>(null);

  const { content, screenPoint } = popup;
  const pointX = screenPoint?.x ?? 0;
  const pointY = screenPoint?.y ?? 0;
  const isVisible = isOpen && Boolean(content) && Boolean(screenPoint);

  useLayoutEffect(() => {
    if (!isVisible) {
      setPlacement(null);
      return;
    }

    const bounds = boundsRef.current;
    const card = cardRef.current;
    if (!bounds || !card) return;

    const reposition = () => {
      const { left, top } = popupService.place(
        { x: pointX, y: pointY },
        card.getBoundingClientRect(),
        bounds.getBoundingClientRect(),
      );

      setPlacement((prev) =>
        prev && prev.left === left && prev.top === top ? prev : { left, top },
      );
    };

    reposition();

    // The card grows as its content renders, and the panel itself resizes when
    // the sidebar toggles or the window changes.
    const observer = new ResizeObserver(reposition);
    observer.observe(card);
    observer.observe(bounds);
    return () => observer.disconnect();
  }, [isVisible, pointX, pointY]);

  if (!isVisible || !content) return null;

  return (
    <div
      ref={boundsRef}
      className={cn("pointer-events-none absolute inset-0 z-40", className)}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        className="glass pointer-events-auto absolute flex max-h-[calc(100%-1rem)] w-72 max-w-[calc(100%-1rem)] flex-col overflow-hidden rounded-card shadow-xl"
        style={{
          left: placement?.left ?? 0,
          top: placement?.top ?? 0,
          // Avoid a flash at the wrong spot on the frame before measurement.
          visibility: placement ? "visible" : "hidden",
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 px-3 py-2">
          <div className="min-w-0">
            <h3 className="break-words text-body font-semibold text-foreground">
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

        <div className="min-h-0 flex-1 overflow-y-auto">
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
                  <dt className="shrink-0 text-muted-foreground">{key}</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {content.actions && content.actions.length > 0 ? (
          <div className="flex shrink-0 gap-2 border-t border-border/60 px-3 py-2">
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
