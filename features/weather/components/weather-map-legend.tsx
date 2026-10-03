"use client";

import { useEffect, useState } from "react";
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
  { color: "#0d9488", label: "Rain showers" },
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

  // Start collapsed on phones so the legend does not cover the map.
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setOpen(false);
  }, []);

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
        "glass pointer-events-auto w-[190px] rounded-xl sm:w-[220px] shadow-panel",
        className,
      )}
      aria-label="Weather map guide"
    >
      <header className="flex items-start justify-between gap-2 border-b border-border/60 px-2.5 py-1.5 sm:px-3 sm:py-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Map guide</p>
          <p className="hidden text-[10px] leading-snug text-muted-foreground sm:block">
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

      <div className="space-y-2 px-2.5 py-2 sm:space-y-3 sm:px-3 sm:py-2.5">
        <section>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            City dots (149)
          </p>
          <ul className="grid grid-cols-1 gap-x-2 gap-y-1 min-[360px]:grid-cols-1 sm:space-y-0.5">
            {CITY_CONDITIONS.map((item) => (
              <li key={item.label} className="flex items-center gap-2 leading-none">
                <svg viewBox="8 6 62 46" className="h-4 w-5 shrink-0" aria-hidden>
                  <path
                    d="M24 21a13 13 0 0 0 0 26h33a13 13 0 0 0 0-26 17 17 0 0 0-33 0z"
                    fill={item.color}
                    stroke="#ffffff"
                    strokeWidth="4"
                    paintOrder="stroke"
                  />
                </svg>
                <span className="text-[11px] text-foreground sm:text-xs">{item.label}</span>
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
