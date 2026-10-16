"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Expand, LayoutGrid, List, X, ZoomIn, ZoomOut } from "lucide-react";
import { AccomplishmentLive } from "@/components/public/accomplishment-live/accomplishment-live";
import { NCR_BOARDS } from "@/lib/config/ncr-boards";
import type { ApiSuccess } from "@/lib/api/response";
import { Portal } from "@/components/ui/portal";
import { useEscapeKey, useLockBodyScroll } from "@/hooks/use-overlay";
import { cn } from "@/utils/cn";

interface NcrDailyPage {
  board: string;
  page: number;
}

/** How many thumbnails the strip shows at first, and how many each "Show more" adds. */
const STRIP_STEP = 24;

/** Sharp WebP from the board's PDF export when the page has one, else Canva's small preview through the image route. */
const pageImage = (p: NcrDailyPage) =>
  p.page <= (NCR_BOARDS.find((b) => b.id === p.board)?.rendered ?? 0)
    ? `/ncr-pages/${p.board}/${p.page}.webp`
    : `/api/accomplishment/ncr-daily/image?board=${p.board}&page=${p.page}`;

type Layout = "grid" | "list";
const LAYOUT_KEY = "okb-ncr-daily-layout";

/** Accomplishment page: the live dashboard. Old #ncr-daily links go to the NCR Daily Accomplishment tab of the Gallery. */
export function AccomplishmentPanels() {
  useEffect(() => {
    if (window.location.hash === "#ncr-daily") window.location.replace("/gallery#ncr-daily");
  }, []);
  return <AccomplishmentLive />;
}

/**
 * Full-screen view of one accomplishment. "Fit" shows the whole page; "Actual size" shows the image at its own
 * pixel size inside a scrollable frame, so the small print can be read (on a phone, drag to pan).
 */
function EnlargedPage({
  src,
  label,
  alt,
  onClose,
  onMove,
}: {
  src: string;
  label: string;
  alt: string;
  onClose: () => void;
  onMove: (step: number) => void;
}) {
  const [actual, setActual] = useState(false);
  const touchX = useRef<number | null>(null);
  useEscapeKey(true, onClose);
  useLockBodyScroll(true);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") onMove(-1);
      if (event.key === "ArrowRight") onMove(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMove]);
  const ZoomIcon = actual ? ZoomOut : ZoomIn;
  return (
    <Portal>
      <div role="dialog" aria-modal="true" aria-label="Enlarged accomplishment" className="fixed inset-0 z-[70] flex flex-col bg-black">
        <div className="flex items-center justify-between gap-2 px-2 py-2 text-white">
          <span className="pl-2 text-sm tabular-nums text-white/70">{label}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActual((v) => !v)}
              className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold hover:bg-white/10"
            >
              <ZoomIcon className="size-5" aria-hidden />
              {actual ? "Fit" : "Zoom"}
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
              <X className="size-6" aria-hidden />
            </button>
          </div>
        </div>
        <div
          className={cn("relative min-h-0 flex-1", actual ? "overflow-auto" : "flex items-center justify-center px-2")}
          onTouchStart={(event) => {
            touchX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchX.current;
            const end = event.changedTouches[0]?.clientX;
            touchX.current = null;
            if (!actual && start !== null && end !== undefined && Math.abs(end - start) > 60) onMove(end < start ? 1 : -1);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            src={src}
            alt={alt}
            onClick={() => setActual((v) => !v)}
            className={actual ? "block max-w-none cursor-zoom-out" : "max-h-full max-w-full cursor-zoom-in object-contain"}
            style={actual ? { width: "max(100%, 1200px)" } : undefined}
          />
          {!actual ? (
            <>
              <button
                type="button"
                onClick={() => onMove(-1)}
                aria-label="Previous"
                className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                aria-label="Next"
                className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
        <p className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 text-center text-xs text-white/60">
          Tap the picture or Zoom to read the small print; arrows or swipe for the next one.
        </p>
      </div>
    </Portal>
  );
}

/** One accomplishment at a time, with previous / next and every page underneath. */
export function NcrDailyAccomplishment() {
  const [pages, setPages] = useState<NcrDailyPage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout>("grid");
  const [shown, setShown] = useState(STRIP_STEP);
  const [enlarged, setEnlarged] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LAYOUT_KEY);
      if (saved === "grid" || saved === "list") setLayout(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const chooseLayout = (next: Layout) => {
    setLayout(next);
    try {
      window.localStorage.setItem(LAYOUT_KEY, next);
    } catch {
      /* storage unavailable */
    }
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/accomplishment/ncr-daily");
        if (!res.ok) throw new Error(String(res.status));
        const body = (await res.json()) as ApiSuccess<NcrDailyPage[]>;
        if (!cancelled) setPages(body.data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const count = pages?.length ?? 0;
  const current = pages?.[index] ?? null;

  const go = (step: number) => {
    if (!count) return;
    setIndex((value) => (value + step + count) % count);
  };

  return (
    <div className="space-y-3">
      <div className="okb-public-card overflow-hidden rounded-sm border shadow-sm">
        {current ? (
          <div
            ref={viewerRef}
            className="relative scroll-mt-4 bg-[#0b1f4d]"
            onTouchStart={(event) => {
              touchX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const start = touchX.current;
              const end = event.changedTouches[0]?.clientX;
              touchX.current = null;
              if (start !== null && end !== undefined && Math.abs(end - start) > 50) go(end < start ? 1 : -1);
            }}
          >
            <button
              type="button"
              onClick={() => setEnlarged(true)}
              aria-label="Enlarge this accomplishment"
              className="group relative mx-auto block w-full max-w-[900px] cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={`${current.board}-${current.page}`}
                src={pageImage(current)}
                alt={`NCR daily accomplishment ${index + 1} of ${count}`}
                className="block h-auto w-full"
              />
              <span className="absolute bottom-2 right-2 inline-flex h-9 items-center gap-1.5 rounded-full bg-black/65 px-3 text-xs font-semibold text-white shadow-sm">
                <Expand className="size-4" aria-hidden /> Enlarge
              </span>
            </button>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute left-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-sm sm:left-3"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-1.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white shadow-sm sm:right-3"
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </div>
        ) : (
          <div className={cn("grid aspect-video w-full place-items-center bg-[var(--dpwh-blue-light)]", !failed && "animate-pulse")} role="status">
            <span className={failed ? "px-4 text-center text-sm font-semibold text-[var(--dpwh-blue)]" : "sr-only"}>
              {failed ? "The board could not be loaded." : "Loading NCR Daily Accomplishment"}
            </span>
          </div>
        )}

        {pages && pages.length > 0 ? (
          <div className="bg-white p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--dpwh-blue)]">All accomplishments ({count})</p>
              <div role="radiogroup" aria-label="Layout" className="inline-flex rounded-full border border-[var(--dpwh-border)] p-0.5">
                {(
                  [
                    { id: "grid", label: "Grid", icon: LayoutGrid },
                    { id: "list", label: "List", icon: List },
                  ] as const
                ).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={layout === id}
                    onClick={() => chooseLayout(id)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors",
                      layout === id ? "bg-[var(--dpwh-blue)] text-white" : "text-[var(--dpwh-muted)]",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div
              aria-label="All accomplishments"
              className={cn(layout === "grid" ? "grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-8" : "flex flex-col gap-1.5")}
            >
              {pages.slice(0, Math.max(shown, index + 1)).map((item, itemIndex) => {
                const selected = itemIndex === index;
                return (
                  <button
                    key={`${item.board}-${item.page}`}
                    type="button"
                    aria-label={`Show accomplishment ${itemIndex + 1} of ${count}`}
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      setIndex(itemIndex);
                      // Bring the picked page to the middle of the screen.
                      viewerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className={cn(
                      "min-h-11 overflow-hidden rounded-sm border-2 text-left",
                      layout === "list" && "flex items-center gap-3 p-1",
                      selected ? "border-[var(--dpwh-orange)]" : "border-transparent",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pageImage(item)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={cn("aspect-video object-cover", layout === "list" ? "w-28 shrink-0 sm:w-40" : "w-full")}
                    />
                    {layout === "list" ? (
                      <span className="min-w-0 text-sm font-semibold text-[var(--dpwh-blue)]">
                        Accomplishment {itemIndex + 1}
                        <span className="block text-xs font-normal text-[var(--dpwh-muted)]">{NCR_BOARDS.find((b) => b.id === item.board)?.label ?? "Board"} · page {item.page}</span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {pages.length > Math.max(shown, index + 1) ? (
              <button
                type="button"
                onClick={() => setShown((value) => value + STRIP_STEP)}
                className="mt-2 min-h-11 w-full rounded-sm border border-[var(--dpwh-border)] text-sm font-semibold text-[var(--dpwh-blue)]"
              >
                Show more ({pages.length - Math.max(shown, index + 1)} left)
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {enlarged && current ? (
        <EnlargedPage
          src={pageImage(current)}
          label={`${index + 1} / ${count}`}
          alt={`NCR daily accomplishment ${index + 1} of ${count}`}
          onClose={() => setEnlarged(false)}
          onMove={go}
        />
      ) : null}

      <p className="okb-public-body text-sm">
        Latest first. Boards on Canva:{" "}
        {NCR_BOARDS.map((board, i) => (
          <span key={board.id}>
            {i ? " · " : ""}
            <a href={board.url} target="_blank" rel="noopener noreferrer" className="okb-public-link">
              {board.label}
              <ExternalLink className="ml-1 inline size-3.5 align-[-2px]" aria-hidden />
            </a>
          </span>
        ))}
        .
      </p>
    </div>
  );
}
