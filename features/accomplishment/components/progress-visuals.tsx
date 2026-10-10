import { CheckCircle2, CircleDashed, CircleDot, CircleHelp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { WORK_STATUS, WORK_STATUS_ORDER, type WorkStatus } from "@/features/accomplishment/lib/rollup";
import { cn } from "@/utils/cn";

export const pctText = (pct: number | null, digits = 1) => (pct === null ? "—" : `${pct.toFixed(digits)}%`);

const STATUS_ICON: Record<WorkStatus, LucideIcon> = {
  done: CheckCircle2,
  ongoing: CircleDot,
  pending: CircleDashed,
  none: CircleHelp,
};

/** Overall progress as a ring; past 100% the ring is simply full. */
export function ProgressRing({ pct, size = 112, stroke = 10, caption }: { pct: number | null; size?: number; stroke?: number; caption: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const share = pct === null ? 0 : Math.max(0, Math.min(100, pct)) / 100;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * share} ${c}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-2xl font-semibold leading-none tabular-nums text-foreground">{pctText(pct)}</span>
        <span className="mt-1 max-w-[80%] text-[10px] leading-tight text-muted-foreground">{caption}</span>
      </div>
    </div>
  );
}

/** A thin progress meter (one hue: progress is magnitude, not state). */
export function Meter({ pct, className, label }: { pct: number | null; className?: string; label?: string }) {
  const width = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct === null ? undefined : Math.round(pct)}
      className={cn("block h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <span className="block h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${width}%` }} />
    </span>
  );
}

/** Records by state as one stacked strip, with a labelled legend (state is never colour alone). */
export function StatusStrip({ counts, legend = true, className }: { counts: Record<WorkStatus, number>; legend?: boolean; className?: string }) {
  const total = WORK_STATUS_ORDER.reduce((n, s) => n + counts[s], 0);
  const shown = WORK_STATUS_ORDER.filter((s) => counts[s] > 0);
  return (
    <div className={className}>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
        {shown.map((s) => (
          <span
            key={s}
            title={`${WORK_STATUS[s].label}: ${counts[s]} of ${total}`}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(counts[s] / total) * 100}%`, backgroundColor: WORK_STATUS[s].color }}
          />
        ))}
      </div>
      {legend ? (
        <ul className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:flex sm:flex-wrap sm:gap-x-4">
          {WORK_STATUS_ORDER.map((s) => (
            <li key={s} className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <StatusIcon status={s} />
              <span className="truncate">{WORK_STATUS[s].label}</span>
              <span className="font-mono font-semibold tabular-nums text-foreground">{counts[s]}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function StatusIcon({ status, className }: { status: WorkStatus; className?: string }) {
  const Icon = STATUS_ICON[status];
  return <Icon className={cn("size-3.5 shrink-0", className)} style={{ color: WORK_STATUS[status].color }} aria-hidden />;
}

/** Icon + label for one record's state. */
export function StatusPill({ status }: { status: WorkStatus }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-foreground">
      <StatusIcon status={status} className="size-3" />
      {WORK_STATUS[status].label}
    </span>
  );
}
