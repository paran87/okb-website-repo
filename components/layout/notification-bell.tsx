"use client";

import { Bell } from "lucide-react";
import { cn } from "@/utils/cn";

interface NotificationBellProps {
  count?: number;
  onClick?: () => void;
  className?: string;
}

/** Notification bell with optional unread indicator. */
export function NotificationBell({
  count = 0,
  onClick,
  className,
}: NotificationBellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        count > 0 ? `Notifications (${count} unread)` : "Notifications"
      }
      className={cn(
        "relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Bell className="size-4" aria-hidden />
      {count > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : (
        <span className="absolute right-2 top-2 size-1.5 rounded-full bg-danger" />
      )}
    </button>
  );
}
