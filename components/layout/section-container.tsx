import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface SectionContainerProps {
  children: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Groups related content with an optional section heading. */
export function SectionContainer({
  children,
  title,
  description,
  actions,
  className,
}: SectionContainerProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {title || description || actions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-h3 text-foreground">{title}</h2>
            ) : null}
            {description ? (
              <p className="text-body text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
