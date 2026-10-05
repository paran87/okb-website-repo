import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Bot, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import type { FloodCondition } from "@/features/reports/types";
import { CONDITION_META, platformLabel, platformTone, statusMeta } from "@/features/reports/lib/labels";

/** "● WHATSAPP" / "● VIBER" — platform chip; unknown platforms still render. */
export function PlatformBadge({ platform, className }: { platform: string | null; className?: string }) {
  const tone = platformTone(platform);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
        tone.ring,
        tone.text,
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", tone.dot)} aria-hidden />
      {platformLabel(platform)}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = statusMeta(status);
  return (
    <Badge
      variant={meta.variant}
      dot
      title={meta.hint}
      className={cn("uppercase tracking-wide", status === "processing" && "animate-pulse", className)}
    >
      {meta.label}
    </Badge>
  );
}

export function ConditionBadge({ condition, className }: { condition: FloodCondition; className?: string }) {
  const meta = CONDITION_META[condition];
  return (
    <Badge variant={meta.variant} dot className={className}>
      {meta.label}
    </Badge>
  );
}

/** Small "AI" marker for AI-generated values. */
export function AiTag({ label = "AI", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-primary",
        className,
      )}
    >
      <Bot className="size-3" aria-hidden />
      {label}
    </span>
  );
}

/**
 * Panel for AI-generated content. Visually distinct (cyan rail, robot icon,
 * explicit "not verified" footer) so it is never mistaken for source data.
 */
export function AiPanel({
  title,
  children,
  footer,
  className,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl border border-primary/30 bg-primary/[0.06] p-4 pl-5",
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary/70",
        className,
      )}
    >
      <header className="mb-2 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Bot className="size-3.5" aria-hidden />
        </span>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{title}</h3>
      </header>
      <div className="text-body text-foreground">{children}</div>
      <footer className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        <Info className="size-3" aria-hidden />
        <span>AI-assisted — not verified. Check against the source report.</span>
        {footer}
      </footer>
    </section>
  );
}

/** Section card with an uppercase operations-style heading. */
export function OpsSection({
  title,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-card border border-border bg-card", className)}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {Icon ? <Icon className="size-3.5 text-primary" aria-hidden /> : null}
          {title}
        </h3>
        {actions}
      </header>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Label/value row; missing values show "Not reported" in muted text. */
export function InfoRow({
  label,
  value,
  mono = false,
  hint,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  hint?: string;
}) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 py-1.5 text-body sm:grid-cols-[11rem_minmax(0,1fr)]">
      <dt className="text-caption font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn("min-w-0 break-words", empty ? "text-muted-foreground/80 italic" : "text-foreground", mono && !empty && "font-mono text-[13px]")}
        title={hint}
      >
        {empty ? "Not reported" : value}
      </dd>
    </div>
  );
}

export function MetricTile({
  label,
  value,
  tone = "default",
  sub,
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info" | "muted";
  sub?: ReactNode;
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-primary",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 font-mono text-xl font-semibold leading-tight", toneClass)}>{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/** Horizontal bar list — compact alternative to a chart for categorical counts. */
export function CountBars({
  items,
  emptyText = "No data in this period.",
  max: maxProp,
}: {
  items: { key: string; label: string; count: number }[];
  emptyText?: string;
  max?: number;
}) {
  if (!items.length) return <p className="text-caption text-muted-foreground">{emptyText}</p>;
  const max = maxProp ?? Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-baseline justify-between gap-3 text-caption">
            <span className={cn("truncate", item.key === "__missing__" ? "italic text-muted-foreground" : "text-foreground")}>
              {item.label}
            </span>
            <span className="font-mono text-foreground">{item.count}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", item.key === "__missing__" ? "bg-muted-foreground/40" : "bg-primary/80")}
              style={{ width: `${Math.max(2, (item.count / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
