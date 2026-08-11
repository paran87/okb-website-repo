"use client";

import { useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useClickOutside, useEscapeKey } from "@/hooks/use-overlay";
import { cn } from "@/utils/cn";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: "start" | "end";
  className?: string;
}

/** Dropdown menu (action list). */
export function Dropdown({
  trigger,
  items,
  align = "end",
  className,
}: DropdownProps) {
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
            role="menu"
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={cn(
              "absolute top-full z-40 mt-1 min-w-48 rounded-lg border border-border bg-popover p-1 shadow-dropdown",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {items.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.id}>
                  {item.separatorBefore ? (
                    <div className="my-1 h-px bg-border" />
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={() => {
                      item.onSelect?.();
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-body transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      item.danger
                        ? "text-danger hover:bg-danger/10"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {ItemIcon ? (
                      <ItemIcon className="size-4 shrink-0" aria-hidden />
                    ) : null}
                    {item.label}
                  </button>
                </div>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
