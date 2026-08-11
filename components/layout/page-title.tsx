import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PageTitleProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/** Lightweight page title block for sticky headers and panel headers. */
export function PageTitle({
  title,
  description,
  actions,
  className,
}: PageTitleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-0.5">
        <h1 className="text-heading text-foreground">{title}</h1>
        {description ? (
          <p className="text-body text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
