"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EngagementBar, GalleryEngagement, useEngagementSummary } from "@/components/public/gallery/gallery-engagement";
import { ChevronLeft, ChevronRight, ExternalLink, Expand, LayoutGrid, List, Search, X, ZoomIn, ZoomOut } from "lucide-react";
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

/** What the header of each page says (read from the images; lib/config/ncr-index.json). */
interface PageText {
  deo?: string;
  location?: string;
  activity?: string;
  date?: string;
}
type NcrTextIndex = Record<string, Record<string, PageText>>;
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
  const [query, setQuery] = useState("");
  const [text, setText] = useState<NcrTextIndex>({});

  // The text of each page loads as its own file, so the page itself stays light.
  useEffect(() => {
    let live = true;
    void import("@/lib/config/ncr-index.json").then((m) => live && setText(m.default as unknown as NcrTextIndex));
    return () => {
      live = false;
    };
  }, []);

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
  const ncrKey = (item: NcrDailyPage) => `ncr:${item.board}:${item.page}`;
  const textOf = (p: NcrDailyPage): PageText => text[p.board]?.[String(p.page)] ?? {};
  // The pages that match the search (all of them when it is empty), each with its place in the full list.
  const matches = useMemo(() => {
    const all = (pages ?? []).map((item, i) => ({ item, i }));
    const needle = query.trim().toLowerCase();
    if (!needle) return all;
    return all.filter(({ item }) => {
      const t = text[item.board]?.[String(item.page)] ?? {};
      return [t.deo, t.location, t.activity, t.date, NCR_BOARDS.find((b) => b.id === item.board)?.label, `page ${item.page}`].some((v) => v?.toLowerCase().includes(needle));
    });
  }, [pages, text, query]);

  // Reaction and comment counts for the rows on screen (list layout); refreshed when another page is opened.
  const { summary, refresh: refreshSummary } = useEngagementSummary(useMemo(() => matches.slice(0, query.trim() ? shown : Math.max(shown, index + 1)).map(({ item }) => `ncr:${item.board}:${item.page}`), [matches, query, shown, index]));
  useEffect(() => refreshSummary(), [index, refreshSummary]);


  const go = (step: number) => {
    if (!count) return;
    setIndex((value) => (value + step + count) % count);
  };

  return (
    <div className="space-y-3">
      <div className="okb-public-card overflow-hidden rounded-sm border shadow-sm">
        {current ? (
          <>
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
          <section aria-label="Reactions and comments" className="flex max-h-[30rem] min-h-0 flex-col bg-[#0b1f4d] px-3 pb-3 pt-1 text-white sm:px-4">
            <GalleryEngagement itemKey={ncrKey(current)} />
          </section>
          </>
        ) : (
          <div className={cn("grid aspect-video w-full place-items-center bg-[var(--dpwh-blue-light)]", !failed && "animate-pulse")} role="status">
            <span className={failed ? "px-4 text-center text-sm font-semibold text-[var(--dpwh-blue)]" : "sr-only"}>
              {failed ? "The board could not be loaded." : "Loading NCR Daily Accomplishment"}
            </span>
          </div>
        )}

        {pages && pages.length > 0 ? (
          <div className="bg-white p-2">
            <p className="mb-1.5 text-sm font-semibold text-[var(--dpwh-blue)]">
              {query.trim() ? `${matches.length} of ${count} accomplishments match` : `All accomplishments (${count})`}
            </p>
            <div className="mb-2 flex items-center gap-2">
              <label className="relative block min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--dpwh-muted)]" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShown(STRIP_STEP);
                  }}
                  placeholder="Search place, office, activity or date"
                  aria-label="Search the accomplishments"
                  className="h-11 w-full rounded-full border border-[var(--dpwh-border)] bg-white pl-10 pr-10 text-sm text-[var(--dpwh-text)] outline-none placeholder:text-[var(--dpwh-muted)] focus:border-[var(--dpwh-blue)] focus:ring-2 focus:ring-[var(--dpwh-blue)]/20 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {query ? (
                  <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-[var(--dpwh-muted)] hover:bg-black/5">
                    <X className="size-4" aria-hidden />
                  </button>
                ) : null}
              </label>
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
                    aria-label={label}
                    onClick={() => chooseLayout(id)}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors sm:px-3.5",
                      layout === id ? "bg-[var(--dpwh-blue)] text-white" : "text-[var(--dpwh-muted)]",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div
              aria-label="All accomplishments"
              className={cn(layout === "grid" ? "grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-8" : "flex flex-col gap-1.5")}
            >
              {matches.slice(0, query.trim() ? shown : Math.max(shown, index + 1)).map(({ item, i: itemIndex }) => {
                const selected = itemIndex === index;
                const t = textOf(item);
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
                      "relative min-h-11 overflow-hidden rounded-sm border-2 text-left transition-all",
                      layout === "list" && "flex items-center gap-3 p-1",
                      selected
                        ? "z-10 scale-[1.04] border-[#fcd116] bg-white shadow-[0_0_0_3px_var(--dpwh-blue-dark),0_8px_20px_rgba(0,40,85,0.45)]"
                        : "border-transparent opacity-60 hover:opacity-100",
                    )}
                  >
                    {selected ? (
                      <span aria-hidden className="absolute left-1 top-1 z-10 inline-flex items-center gap-1 rounded-full bg-[#fcd116] px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-none tracking-wide text-[var(--dpwh-blue-dark)] shadow">
                        <span className="size-1.5 rounded-full bg-[var(--dpwh-blue-dark)]" />
                        Viewing
                      </span>
                    ) : null}
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
                        <span className="line-clamp-2">{t.location ?? `Accomplishment ${itemIndex + 1}`}</span>
                        <span className="block text-xs font-normal text-[var(--dpwh-muted)]">
                          {[t.date, t.deo].filter(Boolean).join(" · ") || `${NCR_BOARDS.find((b) => b.id === item.board)?.label ?? "Board"} · page ${item.page}`}
                        </span>
                        {t.activity ? <span className="line-clamp-2 block text-xs font-normal text-[var(--dpwh-text)]/80">{t.activity}</span> : null}
                        {summary?.enabled ? <EngagementBar stats={summary.items[ncrKey(item)]} variant="list" /> : null}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {query.trim() && matches.length === 0 ? <p className="px-2 py-6 text-center text-sm text-[var(--dpwh-muted)]">Nothing matches your search.</p> : null}
            {matches.length > (query.trim() ? shown : Math.max(shown, index + 1)) ? (
              <button
                type="button"
                onClick={() => setShown((value) => value + STRIP_STEP)}
                className="mt-2 min-h-11 w-full rounded-sm border border-[var(--dpwh-border)] text-sm font-semibold text-[var(--dpwh-blue)]"
              >
                Show more ({matches.length - (query.trim() ? shown : Math.max(shown, index + 1))} left)
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
