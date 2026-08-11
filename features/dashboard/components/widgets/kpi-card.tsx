"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { HoverLift } from "@/components/ui/motion";
import { AnimatedNumber } from "@/features/dashboard/components/widgets/animated-number";
import { MiniSparkline } from "@/features/dashboard/components/widgets/mini-sparkline";
import type { KpiMetric } from "@/features/dashboard/types";
import { cn } from "@/utils/cn";

const STATUS_ACCENT: Record<KpiMetric["status"], string> = {
  normal: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  critical: "bg-danger/15 text-danger",
  success: "bg-success/15 text-success",
};

const STATUS_SPARKLINE: Record<KpiMetric["status"], string> = {
  normal: "stroke-primary",
  warning: "stroke-warning",
  critical: "stroke-danger",
  success: "stroke-success",
};

interface KpiCardProps {
  metric: KpiMetric;
  index?: number;
}

/** Animated KPI card with trend, sparkline, and hover elevation. */
export function KpiCard({ metric }: KpiCardProps) {
  const Icon = metric.icon;
  const TrendIcon =
    metric.trend === "up"
      ? ArrowUpRight
      : metric.trend === "down"
        ? ArrowDownRight
        : ArrowRight;

  const trendColor =
    metric.trend === "up" && metric.status !== "success"
      ? "text-danger"
      : metric.trend === "down" && metric.status === "warning"
        ? "text-success"
        : metric.trend === "up"
          ? "text-success"
          : "text-muted-foreground";

  return (
    <HoverLift>
      <article
        className={cn(
          "glass flex min-w-[168px] flex-col gap-2 rounded-card border border-border/60 p-3 shadow-panel transition-shadow hover:shadow-lg",
          metric.status === "critical" && "border-danger/30",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              STATUS_ACCENT[metric.status],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </div>
          <MiniSparkline
            data={metric.sparkline}
            colorClassName={STATUS_SPARKLINE[metric.status]}
          />
        </div>

        <div>
          <p className="text-label text-muted-foreground">{metric.label}</p>
          <p className="font-mono text-h3 text-foreground">
            <AnimatedNumber value={metric.value} />
          </p>
        </div>

        <div className={cn("flex items-center gap-1 text-caption", trendColor)}>
          <TrendIcon className="size-3.5" aria-hidden />
          <span className="font-medium">{metric.dailyChangeLabel}</span>
        </div>
      </article>
    </HoverLift>
  );
}

/** Re-export as StatisticCard alias for dashboard context. */
export { KpiCard as StatisticCard };

interface KpiGridProps {
  metrics: readonly KpiMetric[];
  className?: string;
}

/** Horizontally scrollable KPI row with staggered entrance. */
export function KpiGrid({ metrics, className }: KpiGridProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 scrollbar-thin sm:gap-3",
        className,
      )}
      role="list"
      aria-label="Key performance indicators"
    >
      {metrics.map((metric) => (
        <div key={metric.id} role="listitem" className="shrink-0">
          <KpiCard metric={metric} />
        </div>
      ))}
    </div>
  );
}
