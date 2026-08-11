"use client";

import {
  Bell,
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/features/dashboard/components/widgets/status-badge";
import type { AlertSeverity, DashboardAlert } from "@/features/dashboard/types";
import { cn } from "@/utils/cn";

const SEVERITY_META: Record<
  AlertSeverity,
  { icon: LucideIcon; accent: string; pulse?: boolean }
> = {
  critical: {
    icon: CircleX,
    accent: "bg-danger/15 text-danger",
    pulse: true,
  },
  warning: {
    icon: TriangleAlert,
    accent: "bg-warning/15 text-warning",
  },
  info: {
    icon: Info,
    accent: "bg-info/15 text-info",
  },
  resolved: {
    icon: CircleCheck,
    accent: "bg-success/15 text-success",
  },
};

interface AlertCardProps {
  alert: DashboardAlert;
  onClick?: () => void;
  className?: string;
}

/** Single alert entry with severity styling. */
export function AlertCard({ alert, onClick, className }: AlertCardProps) {
  const meta = SEVERITY_META[alert.severity];
  const Icon = meta.icon;
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-lg border border-border/60 p-2.5 text-left transition-colors",
        onClick && "hover:bg-muted/40",
        alert.severity === "critical" && "border-danger/30 bg-danger/[0.03]",
        className,
      )}
    >
      <span
        className={cn(
          "relative flex size-8 shrink-0 items-center justify-center rounded-lg",
          meta.accent,
        )}
      >
        {meta.pulse ? (
          <span className="absolute inline-flex size-full animate-ping rounded-lg bg-danger/20 opacity-60" />
        ) : null}
        <Icon className="relative size-4" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-caption font-medium text-foreground">
            {alert.title}
          </span>
          <time className="shrink-0 font-mono text-label text-muted-foreground">
            {alert.timestamp}
          </time>
        </span>
        <p className="mt-0.5 line-clamp-2 text-label text-muted-foreground">
          {alert.message}
        </p>
        {alert.location ? (
          <p className="mt-1 text-label text-muted-foreground">
            {alert.location}
          </p>
        ) : null}
      </span>
    </Wrapper>
  );
}

interface AlertsPanelProps {
  alerts: readonly DashboardAlert[];
  className?: string;
}

/** Alerts widget with severity-filtered list. */
export function AlertsPanel({ alerts, className }: AlertsPanelProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5 px-1">
        <StatusBadge label="Critical" status="critical" pulse />
        <StatusBadge label="Warning" status="warning" />
        <StatusBadge label="Info" status="normal" />
        <StatusBadge label="Resolved" status="success" />
      </div>
      <ul className="max-h-48 space-y-1.5 overflow-y-auto">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <AlertCard alert={alert} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Notification list using AlertCard styling. */
export function NotificationList({
  items,
  className,
}: {
  items: readonly DashboardAlert[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-1.5", className)}>
      {items.map((item) => (
        <li key={item.id}>
          <AlertCard alert={item} />
        </li>
      ))}
    </ul>
  );
}

export { Bell as AlertBellIcon };
