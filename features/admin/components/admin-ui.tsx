"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/utils/cn";

/** Small building blocks shared by the Admin tabs. */

export function AdminCard({
  title,
  icon,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card shadow-sm", className)}>
      {title ? (
        <header className="flex min-h-12 items-center justify-between gap-2 border-b border-border px-4 py-2">
          <h3 className="flex min-w-0 items-center gap-2 text-body font-semibold text-foreground">
            {icon ? <span className="shrink-0 text-primary">{icon}</span> : null}
            <span className="truncate">{title}</span>
          </h3>
          {action}
        </header>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** Segmented control; scrolls inside itself if it ever runs out of room. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex max-w-full overflow-x-auto rounded-xl border border-border bg-muted/50 p-1", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 shrink-0 grow rounded-lg px-3 text-caption font-semibold whitespace-nowrap transition-colors",
            o.value === value
              ? "bg-card text-foreground shadow-sm ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Notice({
  tone = "warning",
  title,
  children,
  action,
}: {
  tone?: "warning" | "info" | "danger";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const tones = {
    warning: "border-warning/40 bg-warning/10 text-warning",
    info: "border-info/40 bg-info/10 text-info",
    danger: "border-danger/40 bg-danger/10 text-danger",
  };
  return (
    <div className={cn("flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center", tones[tone])}>
      <AlertTriangle className="hidden size-5 shrink-0 sm:block" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{title}</p>
        {children ? <div className="mt-1 text-caption text-foreground/80">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}
