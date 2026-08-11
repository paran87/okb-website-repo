"use client";

import { PieChart as RechartsPieChart, Pie, Cell } from "recharts";
import { cn } from "@/utils/cn";
import { colors } from "@/lib/design/tokens";

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  label?: string;
  unit?: string;
  title?: string;
  thresholds?: { value: number; color: string }[];
  height?: number;
  className?: string;
}

/** Semi-circular gauge for KPI / capacity indicators. */
export function GaugeChart({
  value,
  min = 0,
  max = 100,
  label,
  unit = "%",
  title,
  thresholds = [
    { value: 40, color: colors.success },
    { value: 70, color: colors.warning },
    { value: 100, color: colors.danger },
  ],
  height = 180,
  className,
}: GaugeChartProps) {
  const clamped = Math.min(max, Math.max(min, value));
  const pct = max === min ? 0 : ((clamped - min) / (max - min)) * 100;
  const color =
    thresholds.find((t) => pct <= t.value)?.color ??
    thresholds[thresholds.length - 1]?.color ??
    colors.primary;

  const gaugeData = [{ value: pct }, { value: 100 - pct }];

  return (
    <figure className={cn("w-full text-center", className)}>
      {title ? (
        <figcaption className="mb-2 text-subheading text-foreground">
          {title}
        </figcaption>
      ) : null}
      <div className="relative mx-auto" style={{ height, maxWidth: height * 2 }}>
        <RechartsPieChart width={height * 2} height={height}>
          <Pie
            data={gaugeData}
            startAngle={180}
            endAngle={0}
            innerRadius="65%"
            outerRadius="100%"
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="var(--muted)" />
          </Pie>
        </RechartsPieChart>
        <div className="absolute inset-x-0 bottom-2">
          <p className="font-mono text-h2 text-foreground">
            {clamped}
            {unit}
          </p>
          {label ? (
            <p className="text-caption text-muted-foreground">{label}</p>
          ) : null}
        </div>
      </div>
    </figure>
  );
}
