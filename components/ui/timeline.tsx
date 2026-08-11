import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface TimelineItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

const TONE_DOT: Record<NonNullable<TimelineItem["tone"]>, string> = {
  default: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

/** Vertical timeline for operational event history. */
export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn("relative space-y-0", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const tone = item.tone ?? "default";
        return (
          <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!isLast ? (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-border"
                aria-hidden
              />
            ) : null}

            <div className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center">
              {item.icon ?? (
                <span
                  className={cn("size-2.5 rounded-full", TONE_DOT[tone])}
                  aria-hidden
                />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-body font-medium text-foreground">
                  {item.title}
                </p>
                <time className="shrink-0 font-mono text-caption text-muted-foreground">
                  {item.timestamp}
                </time>
              </div>
              {item.description ? (
                <p className="mt-0.5 text-caption text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
