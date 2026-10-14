"use client";

import { useEffect, type ReactNode } from "react";
import { CheckCircle2, CircleDashed, CircleDot, CircleHelp, X, type LucideIcon } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";
import { recordPct, workStatus, type WorkStatus } from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData, AccomplishmentRecord } from "@/features/accomplishment/types";
import { cn } from "@/utils/cn";

/* ----------------------------------------------------------------- formatting */

export const int = (n: number) => Math.round(n).toLocaleString("en-US");
export const pctText = (pct: number | null, digits = 1) => (pct === null ? "—" : `${pct.toFixed(digits)}%`);

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return int(n);
}

export const km = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 100_000 ? 0 : 1)} km` : `${int(m)} m`);

const DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const DAY_SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const STAMP = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Manila" });
const STAMP_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

/** "Jun 26, 2026" for a "2026-06-26" day. */
export const dayText = (iso: string | null | undefined, short = false) =>
  iso ? (short ? DAY_SHORT : DAY).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`)) : "—";
/** "Oct 14, 11:40 AM" (Manila) for an instant. */
export const stampText = (iso: string | null) => (iso ? STAMP.format(new Date(iso)) : "—");
/** Manila calendar day for an instant (log entries are often date-only). */
export const stampDay = (iso: string | null) => (iso ? STAMP_DAY.format(new Date(iso)) : "—");

/** Field photo at a width (lh3 serves resized copies). */
export const photoUrl = (id: string, width = 480) => `https://lh3.googleusercontent.com/d/${id}=w${width}`;

/* ----------------------------------------------------------------- status */

export const STATUS: Record<WorkStatus, { label: string; color: string; bg: string; icon: LucideIcon }> = {
  done: { label: "Completed", color: "#15803d", bg: "#dcfce7", icon: CheckCircle2 },
  ongoing: { label: "Ongoing", color: "#c2410c", bg: "#ffedd5", icon: CircleDot },
  pending: { label: "Not started", color: "#854d0e", bg: "#fef9c3", icon: CircleDashed },
  none: { label: "No report yet", color: "#475569", bg: "#e2e8f0", icon: CircleHelp },
};
export const STATUS_ORDER: WorkStatus[] = ["done", "ongoing", "pending", "none"];

export function StatusPill({ w, scale, className }: { w: AccomplishmentRecord; scale: AccomplishmentData["scale"]; className?: string }) {
  const st = STATUS[workStatus(w, scale)];
  const Icon = st.icon;
  return (
    <span
      className={cn("inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-bold", className)}
      style={{ color: st.color, backgroundColor: st.bg }}
    >
      <Icon className="size-3.5" aria-hidden />
      {st.label}
    </span>
  );
}

/* ----------------------------------------------------------------- progress */

/** One-hue progress meter (progress is magnitude, not state). */
export function Meter({ pct, className, label, tone = "blue" }: { pct: number | null; className?: string; label?: string; tone?: "blue" | "light" }) {
  const width = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <span
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct === null ? undefined : Math.round(pct)}
      className={cn("block h-2 w-full overflow-hidden rounded-full", tone === "light" ? "bg-white/15" : "bg-[#d7dee8]", className)}
    >
      <span
        className={cn(
          "block h-full rounded-full transition-[width] duration-700 ease-out",
          tone === "light" ? "bg-gradient-to-r from-[var(--dpwh-gold)] to-[var(--dpwh-orange)]" : "bg-gradient-to-r from-[#0038a8] to-[#1d6fe0]",
        )}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}

/** Overall progress ring for the navy panel. */
export function ProgressRing({ pct, caption, size = 148 }: { pct: number | null; caption: string; size?: number }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const share = pct === null ? 0 : Math.max(0, Math.min(100, pct)) / 100;
  return (
    <div className="okb-live-ring relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="okb-live-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fcd116" />
            <stop offset="100%" stopColor="#f57e20" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#okb-live-ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * share} ${c}`}
          className="okb-live-ring__arc"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-[2.4rem] font-bold leading-none tracking-wide text-white">{pctText(pct)}</span>
        <span className="mt-1 max-w-[78%] text-[10px] font-bold uppercase leading-tight tracking-[0.14em] text-[var(--dpwh-gold)]">{caption}</span>
      </div>
    </div>
  );
}

export const recordProgress = (w: AccomplishmentRecord, scale: AccomplishmentData["scale"]) => recordPct(w, scale);

/* ----------------------------------------------------------------- layout */

export function Panel({ title, icon: Icon, action, children, className, bodyClassName }: { title?: string; icon?: LucideIcon; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-[var(--dpwh-border)] bg-white shadow-[0_1px_3px_rgba(0,40,85,0.08)]", className)}>
      {title ? (
        <header className="flex min-h-12 items-center justify-between gap-2 border-b border-[#e3e8ef] px-4 py-2.5">
          <h3 className="flex min-w-0 items-center gap-2 font-display text-[1.05rem] font-bold uppercase tracking-wide text-[var(--dpwh-blue-dark)]">
            {Icon ? <Icon className="size-4 shrink-0 text-[var(--dpwh-orange)]" aria-hidden /> : null}
            <span className="truncate">{title}</span>
          </h3>
          {action}
        </header>
      ) : null}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-[var(--dpwh-border)] px-4 py-8 text-center text-sm text-[var(--dpwh-muted)]">{children}</p>;
}

/** Bottom sheet on phones, centred dialog from sm up; scrolls inside; 44px close target. */
export function Sheet({ open, onClose, title, subtitle, children, wide }: { open: boolean; onClose: () => void; title: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  useEscapeKey(open, onClose);
  useLockBodyScroll(open);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    return () => prev?.focus?.();
  }, [open]);
  if (!open) return null;
  return (
    <Portal>
      <div className="okb-public fixed inset-0 z-[80] flex items-end justify-center bg-transparent sm:items-center sm:p-4">
        <div className="absolute inset-0 bg-[#001a3a]/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "okb-live-sheet relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border-t-4 border-[var(--dpwh-orange)] bg-[var(--dpwh-panel)] shadow-2xl sm:rounded-2xl",
            wide ? "sm:max-w-4xl" : "sm:max-w-2xl",
          )}
        >
          <div className="flex items-start gap-3 bg-[var(--dpwh-blue-dark)] py-3 pl-4 pr-2 text-white">
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 className="font-display text-xl font-bold uppercase leading-tight tracking-wide">{title}</h2>
              {subtitle ? <div className="mt-0.5 text-xs text-white/75">{subtitle}</div> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        </div>
      </div>
    </Portal>
  );
}
