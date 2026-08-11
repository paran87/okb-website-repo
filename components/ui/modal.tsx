"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";
import { cn } from "@/utils/cn";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children?: ReactNode;
  footer?: ReactNode;
  closeOnOverlay?: boolean;
}

/** Accessible centered modal dialog with backdrop and motion. */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  closeOnOverlay = true,
}: ModalProps) {
  useEscapeKey(open, onClose);
  useLockBodyScroll(open);

  return (
    <Portal>
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeOnOverlay ? onClose : undefined}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={cn(
                "relative z-10 w-full rounded-card border border-border bg-card text-card-foreground shadow-xl",
                SIZE_CLASSES[size],
              )}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {title ? (
                <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
                  <div className="space-y-1">
                    <h2 className="text-subheading text-foreground">{title}</h2>
                    {description ? (
                      <p className="text-caption text-muted-foreground">
                        {description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ) : null}

              {children ? <div className="px-5 py-4">{children}</div> : null}

              {footer ? (
                <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                  {footer}
                </div>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
