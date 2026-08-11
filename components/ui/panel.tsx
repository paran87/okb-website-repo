import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

/** Command-center panel: a titled surface with optional header actions. */
export function Panel({ glass = false, className, ...props }: PanelProps) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-card shadow-panel",
        glass ? "glass" : "border border-border bg-card",
        className,
      )}
      {...props}
    />
  );
}

interface PanelHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: PanelHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-4 py-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
        <div className="min-w-0">
          <h3 className="truncate text-subheading text-foreground">{title}</h3>
          {subtitle ? (
            <p className="truncate text-caption text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
      ) : null}
    </header>
  );
}

export function PanelBody({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 flex-1 p-4", className)} {...props} />;
}

export function PanelFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <footer
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}
