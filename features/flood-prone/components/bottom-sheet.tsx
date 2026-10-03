"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/utils/cn";

const HANDLE_HEIGHT = 36;
const HALF = 0.45;
const FULL = 0.92;
/** Past this share of the parent, a map selection pulls the sheet back down so the pin isn't hidden. */
const COVERS_MAP = 0.6;
const TAP_SLOP = 4;
/** Released this close to the bottom, the sheet settles fully hidden. */
const HIDE_SNAP = 24;

export type SheetSnap = "hidden" | "half" | "full";

interface BottomSheetProps {
  title: ReactNode;
  /** Toolbar next to the title on desktop, under the drag handle on mobile. */
  actions?: ReactNode;
  children: ReactNode;
  /** Reports the sheet's pixel height once it settles (0 on desktop, where it isn't an overlay). */
  onHeightChange?: (height: number) => void;
  /** Change `nonce` to ask the sheet to snap (e.g. to reveal the map after a selection). */
  snapRequest?: { snap: SheetSnap; nonce: number };
  className?: string;
}

/**
 * Mobile: a draggable sheet over its (relatively positioned) parent that stays
 * wherever it is released; a tap on the handle toggles hidden/half.
 * lg+: a plain panel that fills its grid cell, no dragging.
 *
 * While dragging, the height is written straight to the element (coalesced to
 * one write per frame) so the table isn't re-rendered on every pointer move.
 */
export function BottomSheet({
  title,
  actions,
  children,
  onHeightChange,
  snapRequest,
  className,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null); // null → CSS default (HALF of parent)
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null);
  const pendingHeight = useRef(0);
  const frame = useRef<number | null>(null);

  const parentHeight = () => panelRef.current?.parentElement?.clientHeight ?? 0;
  const isOverlay = () =>
    panelRef.current ? getComputedStyle(panelRef.current).position === "absolute" : false;
  const maxHeight = () => Math.round(parentHeight() * FULL);
  const writeHeight = (h: number) =>
    panelRef.current?.style.setProperty("--sheet-h", `${h}px`);

  const report = useCallback(
    (h: number) => onHeightChange?.(isOverlay() ? h : 0),
    [onHeightChange],
  );

  const settle = useCallback(
    (h: number) => {
      writeHeight(h);
      setHeight(h);
      report(h);
    },
    [report],
  );

  useEffect(() => {
    report(panelRef.current?.offsetHeight ?? 0);
    const onResize = () => {
      setHeight(null);
      panelRef.current?.style.removeProperty("--sheet-h");
      report(panelRef.current?.offsetHeight ?? 0);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [report]);

  useEffect(() => {
    if (!snapRequest || !isOverlay()) return;
    const parent = parentHeight();
    const current = panelRef.current?.offsetHeight ?? 0;
    const targets = {
      hidden: HANDLE_HEIGHT,
      half: Math.round(parent * HALF),
      full: maxHeight(),
    };
    // Only ever lower the sheet to reveal the map when it covers most of it.
    if (
      snapRequest.snap === "full" ||
      (snapRequest.snap === "half"
        ? current > parent * COVERS_MAP
        : current > targets[snapRequest.snap])
    ) {
      settle(targets[snapRequest.snap]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapRequest?.nonce]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isOverlay()) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const startHeight = panelRef.current?.offsetHeight ?? 0;
    drag.current = { startY: e.clientY, startHeight, moved: false };
    pendingHeight.current = startHeight;
    panelRef.current?.setAttribute("data-dragging", "true");
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    const delta = d.startY - e.clientY;
    if (Math.abs(delta) > TAP_SLOP) d.moved = true;
    pendingHeight.current = Math.min(
      maxHeight(),
      Math.max(HANDLE_HEIGHT, d.startHeight + delta),
    );
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        writeHeight(pendingHeight.current);
      });
    }
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    panelRef.current?.removeAttribute("data-dragging");
    if (!d) return;

    if (!d.moved) {
      const current = panelRef.current?.offsetHeight ?? d.startHeight;
      settle(
        current > HANDLE_HEIGHT + 8
          ? HANDLE_HEIGHT
          : Math.round(parentHeight() * HALF),
      );
      return;
    }
    const released = pendingHeight.current;
    settle(released < HANDLE_HEIGHT + HIDE_SNAP ? HANDLE_HEIGHT : released);
  }

  return (
    <div
      ref={panelRef}
      style={{
        ["--sheet-h" as string]: height === null ? `${HALF * 100}%` : `${height}px`,
      }}
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex h-[var(--sheet-h)] flex-col overflow-hidden rounded-t-xl border border-t-[3px] border-border border-t-primary bg-surface shadow-[0_-4px_16px_rgba(0,0,0,0.25)] transition-[height] duration-200 data-[dragging=true]:transition-none",
        "lg:static lg:z-auto lg:h-auto lg:min-h-0 lg:rounded-lg lg:border-t lg:shadow-panel lg:transition-none",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col border-b border-border lg:flex-row lg:items-center lg:justify-between lg:gap-2">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="button"
          aria-label="Drag up or down to show or hide the list"
          className="flex min-h-9 cursor-grab touch-none select-none flex-col items-center justify-center gap-0.5 px-3 active:cursor-grabbing lg:min-h-0 lg:cursor-default lg:flex-row lg:justify-start lg:px-4 lg:py-3"
        >
          <span className="h-1 w-8 rounded-full bg-muted-foreground/40 lg:hidden" aria-hidden />
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
            <ChevronUp className="size-3 lg:hidden" aria-hidden />
            {title}
          </span>
        </div>
        {actions ? (
          <div className="border-t border-border px-3 py-1.5 lg:border-0 lg:px-4">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">{children}</div>
    </div>
  );
}
