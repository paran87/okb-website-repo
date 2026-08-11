import type { KpiStatus, Priority } from "@/features/dashboard/types";
import { cn } from "@/utils/cn";

const STATUS_CLASSES: Record<KpiStatus, string> = {
  normal: "bg-muted text-muted-foreground",
  warning: "bg-warning/15 text-warning",
  critical: "bg-danger/15 text-danger",
  success: "bg-success/15 text-success",
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  critical: "bg-danger/15 text-danger border-danger/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-info/15 text-info border-info/30",
  low: "bg-muted text-muted-foreground border-border",
};

interface StatusBadgeProps {
  label: string;
  status?: KpiStatus;
  pulse?: boolean;
  className?: string;
}

/** Operational status badge with optional pulse for critical states. */
export function StatusBadge({
  label,
  status = "normal",
  pulse = false,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label font-semibold",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {pulse ? (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-danger" />
        </span>
      ) : null}
      {label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

/** Priority level badge for incidents and events. */
export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded border px-1.5 py-0.5 text-label font-semibold uppercase tracking-wide",
        PRIORITY_CLASSES[priority],
        className,
      )}
    >
      {priority}
    </span>
  );
}

export { STATUS_CLASSES, PRIORITY_CLASSES };
