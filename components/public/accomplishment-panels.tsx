"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Activity, ChevronLeft, ChevronRight, ExternalLink, GalleryVerticalEnd, LayoutGrid, List, Radio, type LucideIcon } from "lucide-react";
import { AccomplishmentDashboard } from "@/components/public/accomplishment-dashboard";
import { NCR_BOARDS } from "@/lib/config/ncr-boards";
import type { ApiSuccess } from "@/lib/api/response";
import { cn } from "@/utils/cn";

interface NcrDailyPage {
  board: string;
  page: number;
}

/** How many thumbnails the strip shows at first, and how many each "Show more" adds. */
const STRIP_STEP = 48;

/** Page images are served through this site (see app/api/accomplishment/ncr-daily/image). */
const pageImage = (p: NcrDailyPage) => `/api/accomplishment/ncr-daily/image?board=${p.board}&page=${p.page}`;

type Layout = "grid" | "list";
const LAYOUT_KEY = "okb-ncr-daily-layout";

const TABS: readonly { id: "live" | "ncr-daily"; label: string; hint: string; icon: LucideIcon }[] = [
  { id: "live", label: "Live dashboard", hint: "Progress, types, regions and sites", icon: Activity },
  { id: "ncr-daily", label: "NCR Daily Accomplishment", hint: "Daily boards, latest first", icon: GalleryVerticalEnd },
];

type TabId = (typeof TABS)[number]["id"];

/** Accomplishment page: the live monitor, and the NCR daily board. */
export function AccomplishmentPanels() {
  const baseId = useId();
  const [tab, setTab] = useState<TabId>("live");
  const [ncrOpened, setNcrOpened] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#ncr-daily") {
      setTab("ncr-daily");
      setNcrOpened(true);
    }
  }, []);

  const select = (next: TabId) => {
    setTab(next);
    if (next === "ncr-daily") setNcrOpened(true);
    const hash = next === "ncr-daily" ? "#ncr-daily" : "";
    if (window.location.hash === "#ncr-daily" || next === "ncr-daily") {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative isolate overflow-hidden rounded-xl border border-[#0b3a85] bg-[var(--dpwh-blue-dark)] p-2 shadow-[0_6px_20px_rgba(0,40,85,0.25)] sm:p-3">
        {/* Soft glows and a faint grid behind the tabs. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_120%_at_0%_0%,rgba(0,86,214,0.55),transparent_60%),radial-gradient(50%_120%_at_100%_100%,rgba(245,126,32,0.35),transparent_60%),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:auto,auto,28px_28px,28px_28px]"
        />
        <p className="mb-2 flex items-center gap-1.5 px-1 text-[0.6875rem] font-extrabold uppercase tracking-[0.18em] text-[var(--dpwh-gold)]">
          <Radio className="size-3.5" aria-hidden />
          Program results
        </p>
        <div role="tablist" aria-label="Accomplishment views" className="grid grid-cols-2 gap-2">
          {TABS.map((item) => {
            const selected = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`${baseId}-${item.id}-tab`}
                aria-selected={selected}
                aria-controls={`${baseId}-${item.id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(item.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                  event.preventDefault();
                  const index = TABS.findIndex((entry) => entry.id === item.id);
                  const step = event.key === "ArrowRight" ? 1 : TABS.length - 1;
                  const next = TABS[(index + step) % TABS.length];
                  if (!next) return;
                  select(next.id);
                  document.getElementById(`${baseId}-${next.id}-tab`)?.focus();
                }}
                className={cn(
                  "group relative flex min-h-16 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all sm:gap-3 sm:px-4",
                  selected
                    ? "border-[var(--dpwh-orange)] bg-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    : "border-white/15 bg-white/10 text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/15",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10",
                    selected ? "bg-[var(--dpwh-orange)] text-white" : "bg-white/15 text-[var(--dpwh-gold)]",
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block text-[0.8125rem] font-bold leading-tight sm:text-sm",
                      selected ? "text-[var(--dpwh-blue-dark)]" : "text-white",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className={cn("mt-0.5 hidden text-xs leading-snug sm:block", selected ? "text-[var(--dpwh-muted)]" : "text-white/70")}>
                    {item.hint}
                  </span>
                </span>
                {selected ? (
                  <span aria-hidden className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--dpwh-orange)]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-live-panel`}
        aria-labelledby={`${baseId}-live-tab`}
        hidden={tab !== "live"}
      >
        <AccomplishmentDashboard />
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-ncr-daily-panel`}
        aria-labelledby={`${baseId}-ncr-daily-tab`}
        hidden={tab !== "ncr-daily"}
      >
        {ncrOpened ? <NcrDailyAccomplishment /> : null}
      </div>
    </div>
  );
}

/** One accomplishment at a time, with previous / next and every page underneath. */
function NcrDailyAccomplishment() {
  const [pages, setPages] = useState<NcrDailyPage[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const [layout, setLayout] = useState<Layout>("grid");
  const [shown, setShown] = useState(STRIP_STEP);

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
            className="relative bg-[#0b1f4d]"
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${current.board}-${current.page}`}
              src={pageImage(current)}
              alt={`NCR daily accomplishment ${index + 1} of ${count}`}
              className="mx-auto block h-auto w-full max-w-[900px]"
            />
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
                      window.scrollTo({ top: 0, behavior: "smooth" });
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
