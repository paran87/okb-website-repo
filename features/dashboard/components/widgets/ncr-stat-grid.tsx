import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface NcrStat {
  id: string;
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: "danger" | "success" | "warning" | "primary";
}

const TONE: Record<NcrStat["tone"], string> = {
  danger: "bg-danger/15 text-danger",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  primary: "bg-primary/15 text-primary",
};

/** Headline counts derived from the NCR Critical Areas data. */
export function NcrStatGrid({ stats }: { stats: readonly NcrStat[] }) {
  return (
    <div
      className="grid shrink-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4"
      role="list"
      aria-label="Incident summary"
    >
      {stats.map(({ id, label, value, hint, icon: Icon, tone }) => (
        <article
          key={id}
          role="listitem"
          className="glass flex items-center gap-3 rounded-card border border-border/60 p-3 shadow-panel"
        >
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              TONE[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-label text-muted-foreground">{label}</p>
            <p className="font-mono text-h3 text-foreground">{value}</p>
            <p className="truncate text-label text-muted-foreground">{hint}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
