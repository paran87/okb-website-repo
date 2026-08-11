import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface SectionTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Lightweight heading for grouping content within a page or card. */
export function SectionTitle({
  title,
  description,
  action,
  className,
}: SectionTitleProps) {
  return (
    <div
      className={cn("flex items-start justify-between gap-4", className)}
    >
      <div className="space-y-0.5">
        <h2 className="text-subheading text-foreground">{title}</h2>
        {description ? (
          <p className="text-caption text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
