import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";
import { cn } from "@/utils/cn";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  /** Phones: no breadcrumb or description, actions beside the title (more of the page shows at once). */
  compact?: boolean;
  className?: string;
}

/** Standard page header: breadcrumb + title + description + actions. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  compact = false,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(compact ? "space-y-1 sm:space-y-3" : "space-y-3", className)}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <div className={compact ? "hidden sm:block" : undefined}>
          <Breadcrumb items={breadcrumbs} />
        </div>
      ) : null}
      <div
        className={cn(
          "flex gap-3 sm:flex-row sm:items-center sm:justify-between",
          compact ? "flex-row items-center justify-between" : "flex-col",
        )}
      >
        <div className="min-w-0 space-y-1">
          <h1 className="text-heading text-foreground">{title}</h1>
          {description ? (
            <p className={cn("text-body text-muted-foreground", compact && "hidden sm:block")}>{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
