"use client";

import type { ReactNode } from "react";
import { AppIcons } from "@/lib/config/icons";
import { useUiStore } from "@/lib/store/ui.store";
import { cn } from "@/utils/cn";

interface UtilityPanelProps {
  className?: string;
  children?: ReactNode;
}

/**
 * Collapsible right utility panel for weather, equipment, notifications,
 * and live events. Empty by default — content lands in later phases.
 */
export function UtilityPanel({ className, children }: UtilityPanelProps) {
  const open = useUiStore((state) => state.utilityPanelOpen);
  const toggle = useUiStore((state) => state.toggleUtilityPanel);

  return (
    <aside
      aria-label="Utility panel"
      className={cn(
        "hidden shrink-0 flex-col border-l border-border bg-card transition-[width] duration-200 xl:flex",
        open ? "w-72" : "w-10",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-10 items-center border-b border-border",
          open ? "justify-between px-3" : "justify-center",
        )}
      >
        {open ? (
          <span className="text-caption font-medium text-foreground">
            Utilities
          </span>
        ) : null}
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Collapse utility panel" : "Expand utility panel"}
          aria-expanded={open}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {open ? (
            <AppIcons.utilityPanelClose className="size-4" aria-hidden />
          ) : (
            <AppIcons.utilityPanelOpen className="size-4" aria-hidden />
          )}
        </button>
      </div>

      {open ? (
        <div className="flex flex-1 flex-col overflow-y-auto p-3">
          {children ?? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center">
              <p className="text-caption font-medium text-foreground">
                Utility Panel
              </p>
              <p className="mt-1 text-label text-muted-foreground">
                Weather, equipment, notifications, and live events will
                appear here.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}
