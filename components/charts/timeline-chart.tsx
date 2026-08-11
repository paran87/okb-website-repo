"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from "recharts";
import {
  ChartContainer,
  chartAxisProps,
  chartGridProps,
  chartTooltipProps,
} from "@/components/charts/chart-container";
import { colors } from "@/lib/design/tokens";

export interface TimelineChartEvent {
  x: string | number;
  label: string;
}

interface TimelineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  events?: TimelineChartEvent[];
  title?: string;
  description?: string;
  height?: number;
  color?: string;
}

/** Line chart with reference dots for operational timeline events. */
export function TimelineChart({
  data,
  xKey,
  yKey,
  events = [],
  title,
  description,
  height,
  color = colors.primary,
}: TimelineChartProps) {
  return (
    <ChartContainer title={title} description={description} height={height}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid {...chartGridProps} />
        <XAxis dataKey={xKey} {...chartAxisProps} />
        <YAxis {...chartAxisProps} />
        <Tooltip {...chartTooltipProps()} />
        <Line
          type="stepAfter"
          dataKey={yKey}
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
        {events.map((event) => (
          <ReferenceDot
            key={event.label}
            x={event.x}
            y={0}
            r={5}
            fill={colors.warning}
            label={{ value: event.label, position: "top", fontSize: 10 }}
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  );
}
