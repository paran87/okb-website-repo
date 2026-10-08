"use client";

import { CalendarClock, X } from "lucide-react";
import { formatDate } from "@/features/reports/lib/format";
import {
  MONITORING_PERIODS,
  currentMonitoringPeriod,
  type MonitoringPeriodId,
} from "@/features/reports/lib/monitoring-period";
import { cn } from "@/utils/cn";

export interface MonitoringPeriodValue {
  day: string;
  period: MonitoringPeriodId;
}

/**
 * DATE + MONITORING PERIOD, as on the monitoring sheet: a monitoring day and one of its four 6-hour periods
 * (6 AM–12 PM, 12 PM–6 PM, 6 PM–12 AM, 12 AM–6 AM of the next morning). Asia/Manila.
 */
export function MonitoringPeriodFilter({
  value,
  onChange,
  className,
}: {
  value: MonitoringPeriodValue | null;
  onChange: (value: MonitoringPeriodValue | null) => void;
  className?: string;
}) {
  const now = currentMonitoringPeriod();
  const day = value?.day ?? now.day;
  const label = formatDate(`${day}T12:00:00+08:00`);

  return (
    <div className={cn("rounded-lg border border-border bg-muted/20 p-2", value && "border-primary/60 bg-primary/5", className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <CalendarClock className="size-3.5" aria-hidden />
          Date
        </span>
        <input
          type="date"
          value={day}
          max={now.day}
          onChange={(e) => e.target.value && onChange({ day: e.target.value, period: value?.period ?? now.period })}
          aria-label="Monitoring date"
          className="h-9 rounded-md border border-border bg-card px-2 text-[13px] text-foreground"
        />
        <span className="hidden text-[12px] text-muted-foreground sm:inline">{label}</span>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-[12px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
            Clear period
          </button>
        ) : null}
      </div>
      <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Monitoring period</p>
      <div className="mt-1 grid grid-cols-2 gap-1 sm:grid-cols-4" role="radiogroup" aria-label="Monitoring period">
        {MONITORING_PERIODS.map((p) => {
          const active = value?.period === p.id;
          const isNow = day === now.day && p.id === now.period;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ day, period: p.id })}
              className={cn(
                "relative min-h-10 rounded-md border px-1.5 text-[12px] font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-foreground hover:bg-muted/60",
              )}
            >
              {p.label}
              {isNow ? <span className={cn("ml-1 text-[10px] font-bold uppercase", !active && "text-primary")}>· now</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
