"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";
import { cn } from "@/utils/cn";

interface AdminSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Bottom sheet on phones, centered dialog from sm up. Scrolls inside; 40px close target. */
export function AdminSheet({ open, onClose, title, description, children, footer, wide }: AdminSheetProps) {
  useEscapeKey(open, onClose);
  useLockBodyScroll(open);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
        <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "admin-sheet relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border bg-card text-card-foreground shadow-xl sm:rounded-2xl",
            wide ? "sm:max-w-3xl" : "sm:max-w-lg",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border py-3 pl-4 pr-2">
            <div className="min-w-0 pt-1">
              <h2 className="truncate text-subheading text-foreground">{title}</h2>
              {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </Portal>
  );
}
