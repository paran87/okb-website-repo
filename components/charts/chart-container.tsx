"use client";

import type { ReactElement } from "react";
import { ResponsiveContainer, type TooltipProps } from "recharts";
import { cn } from "@/utils/cn";

interface ChartContainerProps {
  children: ReactElement;
  title?: string;
  description?: string;
  height?: number;
  className?: string;
}

/** Shared chart wrapper: title, sizing, and Recharts ResponsiveContainer. */
export function ChartContainer({
  children,
  title,
  description,
  height = 280,
  className,
}: ChartContainerProps) {
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
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </figure>
  );
}

/** Themed Recharts tooltip content. */
export function ChartTooltipContent({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-dropdown">
      {label ? (
        <p className="mb-1 text-label text-muted-foreground">{label}</p>
      ) : null}
      <ul className="space-y-0.5">
        {payload.map((entry) => (
          <li
            key={entry.name}
            className="flex items-center gap-2 text-caption text-foreground"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono font-medium">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function chartTooltipProps(): Pick<
  TooltipProps<number, string>,
  "content" | "cursor"
> {
  return {
    content: <ChartTooltipContent />,
    cursor: { fill: "var(--muted)", opacity: 0.3 },
  };
}

/** Default axis styling for Recharts. */
export const chartAxisProps = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  axisLine: { stroke: "var(--border)" },
  tickLine: { stroke: "var(--border)" },
} as const;

export const chartGridProps = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  opacity: 0.5,
} as const;
