"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/utils/cn";

interface SidebarFooterProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

/** Sidebar footer with collapse toggle and keyboard hint. */
export function SidebarFooter({
  collapsed,
  onToggle,
  className,
}: SidebarFooterProps) {
  return (
    <div className={cn("border-t border-border", className)}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "flex w-full items-center gap-2 px-4 py-3 text-caption text-muted-foreground transition-colors hover:text-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-4" aria-hidden />
        ) : (
          <>
            <PanelLeftClose className="size-4" aria-hidden />
            <span>Collapse</span>
            <kbd className="ml-auto hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-label lg:inline">
              Ctrl+B
            </kbd>
          </>
        )}
      </button>
    </div>
  );
}
