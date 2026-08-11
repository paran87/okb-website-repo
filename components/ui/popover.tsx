"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useClickOutside, useEscapeKey } from "@/hooks/use-overlay";
import type { Placement } from "@/components/ui/tooltip";
import { cn } from "@/utils/cn";

const PLACEMENT_CLASSES: Record<Placement, string> = {
  top: "bottom-full left-0 mb-2",
  bottom: "top-full left-0 mt-2",
  left: "right-full top-0 mr-2",
  right: "left-full top-0 ml-2",
};

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  placement?: Placement;
  className?: string;
  contentClassName?: string;
}

/** Click-triggered popover with outside-click + Escape dismissal. */
export function Popover({
  trigger,
  children,
  placement = "bottom",
  className,
  contentClassName,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  useEscapeKey(open, () => setOpen(false));

  return (
    <div ref={ref} className={cn("relative inline-flex", className)}>
      <span onClick={() => setOpen((v) => !v)}>{trigger}</span>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={cn(
              "absolute z-40 min-w-48 rounded-lg border border-border bg-popover p-2 shadow-dropdown",
              PLACEMENT_CLASSES[placement],
              contentClassName,
            )}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
