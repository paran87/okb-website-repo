"use client";

import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/utils/cn";

/** Black control bar along the bottom of the phone screen (home · shutter · help / send). */
export function ControlBar({ children, className, inert }: { children: ReactNode; className?: string; inert?: boolean }) {
  return (
    <div className={cn("relative z-20 shrink-0 bg-black px-5 pt-3 text-white", className)} inert={inert}>
      <div className="mx-auto grid max-w-md grid-cols-3 items-center">{children}</div>
    </div>
  );
}

/** White square tile with a black icon, as on the design (home, help, send). */
export function BarTile({
  label,
  onClick,
  href,
  disabled,
  badge,
  align,
  children,
}: {
  label: string;
  /** With `href`, call `preventDefault()` to stay on the page. */
  onClick?: (e: MouseEvent) => void;
  href?: string;
  disabled?: boolean;
  badge?: number;
  align: "start" | "end";
  children: ReactNode;
}) {
  const tile = (
    <>
      <span
        className={cn(
          "relative flex size-14 items-center justify-center rounded-xl bg-white text-black shadow transition-transform active:scale-95",
          disabled && "bg-white/25 text-white/50",
        )}
      >
        {children}
        {badge ? (
          <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-black ring-2 ring-black">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">{label}</span>
    </>
  );
  const cls = cn("flex flex-col items-center", align === "start" ? "justify-self-start" : "justify-self-end");
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls} aria-label={label}>
        {tile}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(cls, disabled && "cursor-not-allowed")} aria-label={label}>
      {tile}
    </button>
  );
}

/** Round white shutter button (take a picture). */
export function ShutterButton({
  label,
  onClick,
  disabled,
  busy,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-label={label}
      className="flex flex-col items-center justify-self-center disabled:opacity-40"
    >
      <span className="flex size-[72px] items-center justify-center rounded-full border-[5px] border-white transition-transform active:scale-90">
        <span className={cn("size-[52px] rounded-full bg-white transition-all", busy && "size-10 bg-white/60")} />
      </span>
    </button>
  );
}
