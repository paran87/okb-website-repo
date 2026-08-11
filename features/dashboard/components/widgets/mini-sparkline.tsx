"use client";

import { cn } from "@/utils/cn";

interface MiniSparklineProps {
  data: readonly number[];
  className?: string;
  colorClassName?: string;
}

/** SVG mini chart placeholder for KPI trend visualization. */
export function MiniSparkline({
  data,
  className,
  colorClassName = "stroke-primary",
}: MiniSparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 64;
  const height = 24;
  const step = width / (data.length - 1);

  const points = data
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-6 w-16 shrink-0", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className={colorClassName}
      />
    </svg>
  );
}
