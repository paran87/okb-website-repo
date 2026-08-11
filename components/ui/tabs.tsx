"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
  value?: string;
  onValueChange?: (id: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

/** Accessible tabs (controlled or uncontrolled). */
export function Tabs({
  items,
  defaultTabId,
  value,
  onValueChange,
  variant = "underline",
  className,
}: TabsProps) {
  const [internal, setInternal] = useState(defaultTabId ?? items[0]?.id);
  const active = value ?? internal;

  const select = (id: string) => {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
  };

  const activeItem = items.find((item) => item.id === active);

  return (
    <div className={className}>
      <div
        role="tablist"
        className={cn(
          "flex items-center gap-1",
          variant === "underline" && "border-b border-border",
        )}
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              disabled={item.disabled}
              onClick={() => select(item.id)}
              className={cn(
                "inline-flex items-center gap-2 text-button transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                variant === "underline" &&
                  "border-b-2 px-3 py-2.5 -mb-px",
                variant === "underline" && isActive
                  ? "border-primary text-primary"
                  : variant === "underline"
                    ? "border-transparent text-muted-foreground hover:text-foreground"
                    : "",
                variant === "pills" && "rounded-lg px-3 py-1.5",
                variant === "pills" && isActive
                  ? "bg-primary/15 text-primary"
                  : variant === "pills"
                    ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : "",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="pt-4">
        {activeItem?.content}
      </div>
    </div>
  );
}
