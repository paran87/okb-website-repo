import type { ReactNode } from "react";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import type { NcrBreakdownRow } from "@/features/dashboard/lib/ncr-summary";
import { cn } from "@/utils/cn";

interface NcrBreakdownPanelProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  rows: readonly NcrBreakdownRow[];
  className?: string;
}

/** Ranked bars of active incidents (NCR Critical Areas) per group. */
export function NcrBreakdownPanel({
  title,
  subtitle,
  icon,
  rows,
  className,
}: NcrBreakdownPanelProps) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <WidgetContainer
      title={title}
      subtitle={subtitle}
      icon={icon}
      className={className}
      compact
      bodyClassName="min-h-0 flex-1 space-y-1.5 overflow-y-auto"
    >
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-baseline justify-between gap-2 text-[11px] leading-tight">
            <span className="min-w-0 truncate font-medium text-foreground">
              {row.label}
            </span>
            <span className="shrink-0 font-mono text-foreground">{row.count}</span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full bg-danger")}
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </WidgetContainer>
  );
}
