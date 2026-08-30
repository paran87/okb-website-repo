"use client";

import { useState } from "react";
import { ChevronDown, List } from "lucide-react";
import { cn } from "@/utils/cn";

interface WeatherMapLegendProps {
  radarOn?: boolean;
  className?: string;
}

const CITY_CONDITIONS = [
  { color: "#eab308", label: "Fair / sunny" },
  { color: "#84cc16", label: "Partly cloudy" },
  { color: "#64748b", label: "Cloudy" },
  { color: "#06b6d4", label: "Rain showers" },
  { color: "#2563eb", label: "Rain" },
  { color: "#ea580c", label: "Thunderstorms" },
  { color: "#dc2626", label: "Monsoon rains" },
] as const;

/** Plain-language weather map key — city dots and rain radar. */
export function WeatherMapLegend({
  radarOn = true,
  className,
}: WeatherMapLegendProps) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "glass pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-panel transition-colors hover:bg-muted/70",
          className,
        )}
        aria-expanded={false}
        aria-label="Show map guide"
      >
        <List className="size-4 shrink-0" aria-hidden />
        Show legend
      </button>
    );
  }

  return (
    <aside
      className={cn(
        "glass pointer-events-auto w-[220px] rounded-xl shadow-panel",
        className,
      )}
      aria-label="Weather map guide"
    >
      <header className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Map guide</p>
          <p className="text-[10px] leading-snug text-muted-foreground">
            What the colors and dots mean
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          aria-expanded={true}
        >
          Hide
          <ChevronDown className="size-3" aria-hidden />
        </button>
      </header>

      <div className="space-y-3 px-3 py-2.5">
        <section>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            City dots (149)
          </p>
          <ul className="space-y-1.5">
            {CITY_CONDITIONS.map((item) => (
              <li key={item.label} className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full ring-2 ring-white dark:ring-slate-900"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="text-xs text-foreground">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={cn(!radarOn && "opacity-50")}>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Rain radar {radarOn ? "" : "(off)"}
          </p>
          <div
            className="h-2 w-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, #22c55e 0%, #eab308 45%, #ef4444 78%, #7f1d1d 100%)",
            }}
            aria-hidden
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Light</span>
            <span>Heavy</span>
          </div>
        </section>
      </div>
    </aside>
  );
}
