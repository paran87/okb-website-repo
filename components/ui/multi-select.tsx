"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, X } from "lucide-react";
import { useClickOutside, useEscapeKey } from "@/hooks/use-overlay";
import type { SelectOption } from "@/components/ui/select";
import { cn } from "@/utils/cn";

interface MultiSelectProps {
  options: SelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/** Multi-select with chip summary and a checkable listbox. */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  useEscapeKey(open, () => setOpen(false));

  const toggle = (val: string) => {
    onChange(
      value.includes(val) ? value.filter((v) => v !== val) : [...value, val],
    );
  };

  const selectedOptions = options.filter((o) => value.includes(o.value));

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-body outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex flex-1 flex-wrap gap-1">
          {selectedOptions.length === 0 ? (
            <span className="px-1 text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-caption text-primary"
              >
                {option.label}
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(option.value);
                  }}
                  className="rounded-full hover:text-foreground"
                >
                  <X className="size-3" aria-hidden />
                </span>
              </span>
            ))
          )}
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
            aria-multiselectable
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-dropdown"
          >
            {options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    disabled={option.disabled}
                    onClick={() => toggle(option.value)}
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
