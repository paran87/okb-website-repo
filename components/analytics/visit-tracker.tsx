"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Records one page view per route change for Admin → Visitors
 * (app/api/track). Sends only the path, page title, referrer, screen size and
 * language; never blocks or affects the page.
 */
export function VisitTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === last.current || pathname.startsWith("/admin")) return;
    // Let the new page set its <title> first.
    const id = window.setTimeout(() => {
      last.current = pathname;
      try {
        void fetch("/api/track", {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pathname,
            title: document.title.slice(0, 300),
            referrer: document.referrer.slice(0, 1024) || undefined,
            screen: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language?.slice(0, 35),
          }),
        }).catch(() => undefined);
      } catch {
        /* analytics must never break the page */
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
