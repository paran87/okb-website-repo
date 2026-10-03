"use client";

import { useEffect, useRef, useState } from "react";
import { FLOODWATCH_URL } from "@/lib/constants";

/**
 * Floodwatch iframe that reloads itself after the tab was hidden or the frame
 * collapsed to zero size (e.g. minimized window). The embedded app picks its
 * layout from its viewport size at load, so without a reload it can stay stuck
 * in a broken narrow layout when the user returns.
 */
export function FloodwatchFrame() {
  const [instance, setInstance] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let wasHidden = document.visibilityState === "hidden";
    let wasCollapsed = false;

    const reloadIfNeeded = () => {
      if (wasHidden || wasCollapsed) {
        wasHidden = false;
        wasCollapsed = false;
        setInstance((n) => n + 1);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
      } else {
        reloadIfNeeded();
      }
    };

    const container = containerRef.current;
    const observer = container
      ? new ResizeObserver(([entry]) => {
          if (!entry) return;
          const { width, height } = entry.contentRect;
          if (width < 50 || height < 50) {
            wasCollapsed = true;
          } else {
            reloadIfNeeded();
          }
        })
      : null;
    if (container && observer) observer.observe(container);

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="flex min-h-0 w-full flex-1 flex-col">
      <iframe
        key={instance}
        src={FLOODWATCH_URL}
        title="Floodwatch drainage monitoring"
        className="min-h-0 w-full flex-1 border-0 bg-background"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="fullscreen; geolocation"
      />
    </div>
  );
}
