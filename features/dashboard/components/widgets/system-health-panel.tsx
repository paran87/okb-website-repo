"use client";

import { Activity } from "lucide-react";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import type { SystemHealthItem } from "@/features/dashboard/types";
import { cn } from "@/utils/cn";

interface SystemHealthPanelProps {
  items: readonly SystemHealthItem[];
  className?: string;
}

const STATUS_TONE = {
  online: "online" as const,
  degraded: "warning" as const,
  offline: "offline" as const,
};

/** System health status grid for dashboard right panel. */
export function SystemHealthPanel({ items, className }: SystemHealthPanelProps) {
  return (
    <WidgetContainer
      title="System Health"
      icon={<Activity className="size-4" aria-hidden />}
      className={className}
      bodyClassName="space-y-2"
    >
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md border border-border/60 bg-card/40 px-2.5 py-1.5"
          >
            <span className="text-caption text-foreground">{item.label}</span>
            <StatusIndicator
              tone={STATUS_TONE[item.status]}
              pulse={item.status === "online"}
              label={item.detail ?? item.status}
              className={cn(
                "text-label capitalize",
                item.status === "degraded" && "[&_span:last-child]:text-warning",
              )}
            />
          </li>
        ))}
      </ul>
    </WidgetContainer>
  );
}

/** Dashboard-scoped connection status indicator. */
export function ConnectionStatus({
  quality = "good",
  className,
}: {
  quality?: "excellent" | "good" | "fair" | "poor";
  className?: string;
}) {
  const tone =
    quality === "excellent" || quality === "good"
      ? "online"
      : quality === "fair"
        ? "warning"
        : "danger";

  return (
    <StatusIndicator
      tone={tone}
      pulse
      label={`Realtime ${quality}`}
      className={className}
    />
  );
}
