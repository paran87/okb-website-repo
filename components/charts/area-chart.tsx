"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
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

export interface AreaChartSeries {
  dataKey: string;
  name?: string;
  color?: string;
  stackId?: string;
}

interface AreaChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: AreaChartSeries[];
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
}

/** Themed area chart for cumulative / stacked time-series. */
export function AreaChart({
  data,
  xKey,
  series,
  title,
  description,
  height,
  showLegend = true,
}: AreaChartProps) {
  return (
    <ChartContainer title={title} description={description} height={height}>
      <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey={xKey} {...chartAxisProps} />
        <YAxis {...chartAxisProps} />
        <Tooltip {...chartTooltipProps()} />
        {showLegend ? <Legend /> : null}
        {series.map((s, i) => {
          const color = s.color ?? chartPalette[i % chartPalette.length];
          return (
            <Area
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name ?? s.dataKey}
              stroke={color}
              fill={color}
              fillOpacity={0.2}
              stackId={s.stackId}
            />
          );
        })}
      </RechartsAreaChart>
    </ChartContainer>
  );
}
