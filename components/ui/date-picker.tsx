"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useClickOutside, useEscapeKey } from "@/hooks/use-overlay";
import { cn } from "@/utils/cn";

interface DatePickerProps {
  value?: Date | null;
  onChange?: (date: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Calendar date picker (dependency-free) in a popover. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(value ?? new Date());
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  useEscapeKey(open, () => setOpen(false));

  const cells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i += 1) result.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) result.push(new Date(year, month, d));
    return result;
  }, [viewDate]);

  const today = new Date();

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-body outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={cn(value ? "text-foreground" : "text-muted-foreground")}>
          {value
            ? value.toLocaleDateString("en-PH", {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })
            : placeholder}
        </span>
        <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute z-30 mt-1 w-72 rounded-lg border border-border bg-popover p-3 shadow-dropdown"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() =>
                  setViewDate(
                    new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1),
                  )
                }
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <span className="text-body font-medium text-foreground">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                aria-label="Next month"
                onClick={() =>
                  setViewDate(
                    new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1),
                  )
                }
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-label text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {cells.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} />;
                const isSelected = value ? sameDay(date, value) : false;
                const isToday = sameDay(date, today);
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    onClick={() => {
                      onChange?.(date);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-md text-caption transition-colors",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted",
                      !isSelected && isToday && "ring-1 ring-ring",
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
