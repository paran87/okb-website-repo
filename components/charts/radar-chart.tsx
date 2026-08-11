"use client";

import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from "recharts";
import { chartPalette } from "@/lib/design/tokens";
import {
  ChartContainer,
  chartTooltipProps,
} from "@/components/charts/chart-container";

export interface RadarChartSeries {
  dataKey: string;
  name?: string;
  color?: string;
}

interface RadarChartProps {
  data: Record<string, unknown>[];
  angleKey: string;
  series: RadarChartSeries[];
  title?: string;
  description?: string;
  height?: number;
}

/** Themed radar chart for multi-axis capability / risk profiles. */
export function RadarChart({
  data,
  angleKey,
  series,
  title,
  description,
  height,
}: RadarChartProps) {
  return (
    <ChartContainer title={title} description={description} height={height}>
      <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey={angleKey}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <PolarRadiusAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
        <Tooltip {...chartTooltipProps()} />
        <Legend />
        {series.map((s, i) => {
          const color = s.color ?? chartPalette[i % chartPalette.length];
          return (
            <Radar
              key={s.dataKey}
              name={s.name ?? s.dataKey}
              dataKey={s.dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.25}
            />
          );
        })}
      </RechartsRadarChart>
    </ChartContainer>
  );
}
