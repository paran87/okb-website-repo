"use client";

import { useEffect } from "react";
import { prefetchPdfEngine } from "@/features/river-basin/components/study-pages";

/** Loads the PDF engine while the user is still choosing a basin. */
export function PrefetchPdfEngine() {
  useEffect(() => {
    const idle =
      window.requestIdleCallback ??
      ((cb: () => void) => window.setTimeout(cb, 300));
    idle(prefetchPdfEngine);
  }, []);
  return null;
}
