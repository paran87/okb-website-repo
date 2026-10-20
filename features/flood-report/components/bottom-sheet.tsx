"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Phone bottom sheet: slides up over the map, closes with the X, a tap on the backdrop, Escape, or by
 * dragging the handle down.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div className={cn("fixed inset-0 z-40", open ? "pointer-events-auto" : "pointer-events-none")} inert={!open}>
      <div
        className={cn("absolute inset-0 bg-black/40 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl bg-white text-slate-900 shadow-2xl",
          drag === 0 && "transition-transform duration-300 ease-out",
          className,
        )}
        style={{ transform: open ? `translateY(${drag}px)` : "translateY(105%)" }}
      >
        <div
          className="flex shrink-0 touch-none flex-col items-center px-4 pt-2"
          onPointerDown={(e) => {
            start.current = e.clientY;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current));
          }}
          onPointerUp={() => {
            if (drag > 90) onClose();
            start.current = null;
            setDrag(0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDrag(0);
          }}
        >
          <span className="h-1.5 w-12 rounded-full bg-slate-300" aria-hidden />
          <div className="flex w-full items-center justify-between gap-3 py-2">
            <h2 className="min-w-0 truncate text-lg font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 active:bg-slate-200"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </section>
    </div>
  );
}
