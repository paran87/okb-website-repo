"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts";
import { chartPalette } from "@/lib/design/tokens";
import {
  ChartContainer,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
} from "@/components/charts/chart-container";

export interface BarChartSeries {
  dataKey: string;
  name?: string;
  color?: string;
  stackId?: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: BarChartSeries[];
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
}

/** Themed bar chart for categorical operational metrics. */
export function BarChart({
  data,
  xKey,
  series,
  title,
  description,
  height,
  showLegend = true,
}: BarChartProps) {
  return (
    <ChartContainer title={title} description={description} height={height}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey={xKey} {...chartAxisProps} />
        <YAxis {...chartAxisProps} />
        <Tooltip {...chartTooltipProps()} />
        {showLegend ? <Legend /> : null}
        {series.map((s, i) => (
          <Bar
            key={s.dataKey}
            dataKey={s.dataKey}
            name={s.name ?? s.dataKey}
            fill={s.color ?? chartPalette[i % chartPalette.length]}
            stackId={s.stackId}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  );
}
