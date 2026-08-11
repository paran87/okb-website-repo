"use client";

import {
  LineChart as RechartsLineChart,
  Line,
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

export interface LineChartSeries {
  dataKey: string;
  name?: string;
  color?: string;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: LineChartSeries[];
  title?: string;
  description?: string;
  height?: number;
  showLegend?: boolean;
}

/** Themed line chart for time-series operational data. */
export function LineChart({
  data,
  xKey,
  series,
  title,
  description,
  height,
  showLegend = true,
}: LineChartProps) {
  return (
    <ChartContainer title={title} description={description} height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey={xKey} {...chartAxisProps} />
        <YAxis {...chartAxisProps} />
        <Tooltip {...chartTooltipProps()} />
        {showLegend ? <Legend /> : null}
        {series.map((s, i) => (
          <Line
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            name={s.name ?? s.dataKey}
            stroke={s.color ?? chartPalette[i % chartPalette.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  );
}
