"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/utils/cn";

export type MapPanelPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const POSITION_CLASSES: Record<MapPanelPosition, string> = {
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
};

interface MapPanelProps {
  position?: MapPanelPosition;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Floating glass panel positioned over a map. Absolute within a relative map
 * container. Presentational — pass any overlay content (legend, filters, ...).
 */
export function MapPanel({
  position = "top-right",
  title,
  className,
  children,
}: MapPanelProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={cn(
        "glass pointer-events-auto absolute z-10 max-w-xs rounded-card shadow-panel",
        POSITION_CLASSES[position],
        className,
      )}
    >
      {title ? (
        <div className="border-b border-border/60 px-3 py-2 text-label text-muted-foreground">
          {title}
        </div>
      ) : null}
      <div className="p-3">{children}</div>
    </motion.div>
  );
}
