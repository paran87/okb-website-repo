import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn";

interface StatisticCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: { value: string; direction: "up" | "down" };
  accentClassName?: string;
  className?: string;
}

/** KPI tile for dashboards and overview screens. */
export function StatisticCard({
  label,
  value,
  icon: IconComponent,
  trend,
  accentClassName = "text-primary bg-primary/15",
  className,
}: StatisticCardProps) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-label text-muted-foreground">{label}</p>
          <p className="font-mono text-heading text-foreground">{value}</p>
          {trend ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-caption font-medium",
                trend.direction === "up" ? "text-success" : "text-danger",
              )}
            >
              {trend.direction === "up" ? (
                <ArrowUpRight className="size-3.5" aria-hidden />
              ) : (
                <ArrowDownRight className="size-3.5" aria-hidden />
              )}
              {trend.value}
            </span>
          ) : null}
        </div>
        {IconComponent ? (
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              accentClassName,
            )}
          >
            <IconComponent className="size-5" aria-hidden />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
