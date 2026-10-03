import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface NcrStat {
  id: string;
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: "danger" | "success" | "warning" | "primary" | "zone";
}

const TONE: Record<NcrStat["tone"], string> = {
  danger: "bg-danger/15 text-danger",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  primary: "bg-primary/15 text-primary",
  zone: "bg-[#7c3aed]/15 text-[#7c3aed]",
};

/** Headline counts derived from the NCR Critical Areas data. */
export function NcrStatGrid({ stats }: { stats: readonly NcrStat[] }) {
  return (
    <div
      className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 lg:grid-cols-5 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1"
      role="list"
      aria-label="Incident summary"
    >
      {stats.map(({ id, label, value, hint, icon: Icon, tone }) => (
        <article
          key={id}
          role="listitem"
          className="glass flex items-center gap-2 rounded-lg border border-border/60 p-2 shadow-panel"
        >
          <div
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md",
              TONE[tone],
            )}
          >
            <Icon className="size-3.5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[10px] leading-tight text-muted-foreground">{label}</p>
            <p className="font-mono text-base font-semibold leading-tight text-foreground">{value}</p>
            <p className="truncate text-[10px] leading-tight text-muted-foreground">{hint}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
