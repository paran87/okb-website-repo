"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";
import { cn } from "@/utils/cn";

type DrawerSide = "left" | "right";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  title?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Slide-in side panel (sheet). Defaults to the right edge. */
export function Drawer({
  open,
  onClose,
  side = "right",
  title,
  children,
  footer,
  className,
}: DrawerProps) {
  useEscapeKey(open, onClose);
  useLockBodyScroll(open);

  const offscreen = side === "right" ? "100%" : "-100%";

  return (
    <Portal>
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={cn(
                "absolute top-0 flex h-full w-full max-w-md flex-col border-border bg-card text-card-foreground shadow-2xl",
                side === "right" ? "right-0 border-l" : "left-0 border-r",
                className,
              )}
              initial={{ x: offscreen }}
              animate={{ x: 0 }}
              exit={{ x: offscreen }}
              transition={{ type: "tween", duration: 0.22, ease: "easeInOut" }}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="text-subheading text-foreground">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
              {footer ? (
                <div className="border-t border-border px-5 py-4">{footer}</div>
              ) : null}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
