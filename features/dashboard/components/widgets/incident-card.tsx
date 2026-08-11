"use client";

import type { LucideIcon } from "lucide-react";
import { MapPin } from "lucide-react";
import {
  PriorityBadge,
  StatusBadge,
} from "@/features/dashboard/components/widgets/status-badge";
import type { OperationalListItem } from "@/features/dashboard/types";
import { cn } from "@/utils/cn";

interface IncidentCardProps {
  item: OperationalListItem;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

/** Scrollable list item for incidents, critical areas, reports, and closures. */
export function IncidentCard({
  item,
  icon: Icon = MapPin,
  onClick,
  className,
}: IncidentCardProps) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-lg border border-transparent px-2 py-2.5 text-left transition-colors",
        onClick && "hover:border-border hover:bg-muted/40",
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md",
          item.statusTone === "critical"
            ? "bg-danger/15 text-danger"
            : item.statusTone === "warning"
              ? "bg-warning/15 text-warning"
              : item.statusTone === "success"
                ? "bg-success/15 text-success"
                : "bg-primary/15 text-primary",
        )}
      >
        <Icon className="size-3.5" aria-hidden />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-caption font-medium text-foreground">
            {item.title}
          </span>
          <time className="shrink-0 font-mono text-label text-muted-foreground">
            {item.timestamp}
          </time>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-label text-muted-foreground">{item.location}</span>
          <StatusBadge label={item.status} status={item.statusTone} />
          <PriorityBadge priority={item.priority} />
        </span>
      </span>
    </Wrapper>
  );
}
