"use client";

import { Fragment } from "react";
import { cn } from "@/utils/cn";
import { riskColors } from "@/lib/design/tokens";

export interface HeatMapCell {
  row: string;
  col: string;
  value: number;
}

interface HeatMapProps {
  rows: string[];
  cols: string[];
  data: HeatMapCell[];
  title?: string;
  description?: string;
  min?: number;
  max?: number;
  className?: string;
}

/** CSS-grid heat map for risk / intensity matrices (no canvas dependency). */
export function HeatMap({
  rows,
  cols,
  data,
  title,
  description,
  min = 0,
  max = 100,
  className,
}: HeatMapProps) {
  const lookup = new Map(data.map((d) => [`${d.row}:${d.col}`, d.value]));

  const colorFor = (value: number) => {
    const t = max === min ? 0 : (value - min) / (max - min);
    if (t < 0.25) return riskColors.low;
    if (t < 0.5) return riskColors.moderate;
    if (t < 0.75) return riskColors.high;
    return riskColors.severe;
  };

  return (
    <figure className={cn("w-full", className)}>
      {title || description ? (
        <figcaption className="mb-3 space-y-0.5">
          {title ? (
            <p className="text-subheading text-foreground">{title}</p>
          ) : null}
          {description ? (
            <p className="text-caption text-muted-foreground">{description}</p>
          ) : null}
        </figcaption>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border">
        <div
          className="grid min-w-max gap-px bg-border p-px"
          style={{
            gridTemplateColumns: `auto repeat(${cols.length}, minmax(3rem, 1fr))`,
          }}
        >
          <div className="bg-card p-2" />
          {cols.map((col) => (
            <div
              key={col}
              className="bg-card p-2 text-center text-label text-muted-foreground"
            >
              {col}
            </div>
          ))}
          {rows.map((row) => (
            <Fragment key={row}>
              <div className="bg-card p-2 text-label text-muted-foreground">
                {row}
              </div>
              {cols.map((col) => {
                const value = lookup.get(`${row}:${col}`) ?? 0;
                return (
                  <div
                    key={`${row}-${col}`}
                    className="flex items-center justify-center bg-card p-2 font-mono text-caption text-foreground"
                    style={{ backgroundColor: `${colorFor(value)}22` }}
                    title={`${row} / ${col}: ${value}`}
                  >
                    {value}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </figure>
  );
}
