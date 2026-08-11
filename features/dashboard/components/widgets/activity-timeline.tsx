"use client";

import {
  CloudRain,
  FileText,
  Route,
  Settings,
  Truck,
  Waves,
} from "lucide-react";
import { HoverLift } from "@/components/ui/motion";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import { PriorityBadge } from "@/features/dashboard/components/widgets/status-badge";
import type { ActivityCategory, ActivityEvent } from "@/features/dashboard/types";
import { cn } from "@/utils/cn";

const CATEGORY_META: Record<
  ActivityCategory,
  { icon: typeof Waves; tone: string }
> = {
  flood: { icon: Waves, tone: "text-danger bg-danger/15" },
  equipment: { icon: Truck, tone: "text-primary bg-primary/15" },
  weather: { icon: CloudRain, tone: "text-info bg-info/15" },
  water: { icon: Waves, tone: "text-warning bg-warning/15" },
  road: { icon: Route, tone: "text-warning bg-warning/15" },
  report: { icon: FileText, tone: "text-success bg-success/15" },
  system: { icon: Settings, tone: "text-muted-foreground bg-muted" },
};

interface ActivityTimelineProps {
  events: readonly ActivityEvent[];
  className?: string;
}

/** Horizontal live activity timeline for the dashboard footer. */
export function ActivityTimeline({ events, className }: ActivityTimelineProps) {
  return (
    <WidgetContainer
      title="Live Activity"
      subtitle="Real-time operational event stream"
      className={className}
      noPadding
      bodyClassName="overflow-hidden"
    >
      <div className="flex gap-2 overflow-x-auto p-3 scrollbar-thin">
        {events.map((event) => (
          <TimelineCard key={event.id} event={event} />
        ))}
      </div>
    </WidgetContainer>
  );
}

/** Single timeline event card. */
export function TimelineCard({ event }: { event: ActivityEvent }) {
  const meta = CATEGORY_META[event.category];
  const Icon = meta.icon;

  return (
    <HoverLift>
      <article
        className={cn(
          "glass w-64 shrink-0 rounded-lg border border-border/60 p-3 shadow-panel",
          event.priority === "critical" && "border-danger/30",
        )}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              meta.tone,
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <time className="font-mono text-label font-medium text-primary">
                {event.time}
              </time>
              <PriorityBadge priority={event.priority} />
            </div>
            <p className="mt-0.5 text-caption font-semibold text-foreground">
              {event.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-label text-muted-foreground">
              {event.description}
            </p>
            <p className="mt-1 text-label uppercase tracking-wide text-muted-foreground">
              {event.category}
            </p>
          </div>
        </div>
      </article>
    </HoverLift>
  );
}

export { TimelineCard as TimelineCardWidget };
