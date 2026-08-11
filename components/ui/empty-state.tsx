import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
}

/** Neutral empty-data state for lists, tables, and modules. */
export function EmptyState({
  title,
  description,
  icon: IconComponent = Inbox,
  action,
  className,
  titleClassName,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <IconComponent className="size-7" aria-hidden />
      </div>
      <div className="space-y-1">
        <p className={cn("text-subheading text-foreground", titleClassName)}>
          {title}
        </p>
        {description ? (
          <p className="mx-auto max-w-sm text-body text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
