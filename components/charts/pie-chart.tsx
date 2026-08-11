"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";
import { chartPalette } from "@/lib/design/tokens";
import {
  ChartContainer,
  chartTooltipProps,
} from "@/components/charts/chart-container";

export interface PieChartSlice {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartSlice[];
  title?: string;
  description?: string;
  height?: number;
  innerRadius?: number;
}

/** Themed pie / donut chart for proportional breakdowns. */
export function PieChart({
  data,
  title,
  description,
  height,
  innerRadius = 0,
}: PieChartProps) {
  return (
    <ChartContainer title={title} description={description} height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius="80%"
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={entry.color ?? chartPalette[i % chartPalette.length]}
            />
          ))}
        </Pie>
        <Tooltip {...chartTooltipProps()} />
        <Legend />
      </RechartsPieChart>
    </ChartContainer>
  );
}
