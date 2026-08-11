"use client";

import {
  Bell,
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";

export type NotificationTone = "info" | "success" | "warning" | "danger" | "default";

const TONE_META: Record<NotificationTone, { icon: LucideIcon; accent: string }> = {
  info: { icon: Info, accent: "text-info bg-info/15" },
  success: { icon: CircleCheck, accent: "text-success bg-success/15" },
  warning: { icon: TriangleAlert, accent: "text-warning bg-warning/15" },
  danger: { icon: CircleX, accent: "text-danger bg-danger/15" },
  default: { icon: Bell, accent: "text-primary bg-primary/15" },
};

interface NotificationCardProps {
  title: string;
  message?: string;
  time?: string;
  tone?: NotificationTone;
  read?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Notification list item with unread indicator. */
export function NotificationCard({
  title,
  message,
  time,
  tone = "default",
  read = false,
  onClick,
  className,
}: NotificationCardProps) {
  const meta = TONE_META[tone];
  const IconComponent = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/40",
        !read && "bg-primary/[0.04]",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          meta.accent,
        )}
      >
        <IconComponent className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-body font-medium text-foreground">
            {title}
          </span>
          {!read ? (
            <span className="size-2 shrink-0 rounded-full bg-primary" />
          ) : null}
        </span>
        {message ? (
          <span className="mt-0.5 line-clamp-2 block text-caption text-muted-foreground">
            {message}
          </span>
        ) : null}
        {time ? (
          <span className="mt-1 block text-label text-muted-foreground">
            {time}
          </span>
        ) : null}
      </span>
    </button>
  );
}
