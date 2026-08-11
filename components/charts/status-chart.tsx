"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { ChartContainer } from "@/components/charts/chart-container";
import { colors } from "@/lib/design/tokens";

export interface StatusChartItem {
  name: string;
  value: number;
  status: "success" | "warning" | "danger" | "info" | "neutral";
}

const STATUS_FILL: Record<StatusChartItem["status"], string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  info: colors.info,
  neutral: colors.mutedForeground,
};

interface StatusChartProps {
  data: StatusChartItem[];
  title?: string;
  description?: string;
  height?: number;
}

/** Horizontal bar chart with per-bar status coloring. */
export function StatusChart({
  data,
  title,
  description,
  height = 200,
}: StatusChartProps) {
  return (
    <ChartContainer title={title} description={description} height={height}>
      <RechartsBarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={STATUS_FILL[entry.status]} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ChartContainer>
  );
}
