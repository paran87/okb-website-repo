"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { useClickOutside, useEscapeKey } from "@/hooks/use-overlay";
import { cn } from "@/utils/cn";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Custom single-select with a keyboard-accessible listbox popover. */
export function Select({
  options,
  value,
  onChange,
  placeholder = "Select…",
  invalid = false,
  disabled = false,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  useEscapeKey(open, () => setOpen(false));

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 text-body outline-none transition-colors focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-danger" : "border-border focus:border-ring",
        )}
      >
        <span className={cn(selected ? "text-foreground" : "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-dropdown"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={option.disabled}
                    onClick={() => {
                      onChange?.(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-body transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      isSelected
                        ? "bg-primary/15 text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {option.label}
                    {isSelected ? <Check className="size-4" aria-hidden /> : null}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
