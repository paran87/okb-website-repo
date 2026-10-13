"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, LayoutGrid, List } from "lucide-react";
import { AccomplishmentDashboard } from "@/components/public/accomplishment-dashboard";
import { NCR_DAILY_ACCOMPLISHMENT_URL } from "@/lib/constants";
import type { ApiSuccess } from "@/lib/api/response";
import { cn } from "@/utils/cn";

interface NcrDailyPage {
  page: number;
  url: string;
}

/** Page images are served through this site (see app/api/accomplishment/ncr-daily/image). */
const pageImage = (page: number) => `/api/accomplishment/ncr-daily/image?page=${page}`;

type Layout = "grid" | "list";
const LAYOUT_KEY = "okb-ncr-daily-layout";

const TABS = [
  { id: "live", label: "Live dashboard" },
  { id: "ncr-daily", label: "NCR Daily Accomplishment" },
] as const;

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
      <div className="-mx-1 overflow-x-auto px-1">
        <div
          role="tablist"
          aria-label="Accomplishment views"
          className="flex w-max min-w-full gap-1 border-b border-[var(--dpwh-border)]"
        >
          {TABS.map((item) => {
            const selected = tab === item.id;
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
                  "min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors sm:px-4",
                  selected
                    ? "border-[var(--dpwh-orange)] text-[var(--dpwh-blue)]"
                    : "border-transparent text-[var(--dpwh-muted)] hover:text-[var(--dpwh-blue)]",
                )}
              >
                {item.label}
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
              key={current.page}
              src={pageImage(current.page)}
              alt={`NCR daily accomplishment ${index + 1} of ${count}`}
              className="block h-auto w-full"
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
              {pages.map((item, itemIndex) => {
                const selected = itemIndex === index;
                return (
                  <button
                    key={item.page}
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
                      src={pageImage(item.page)}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className={cn("aspect-video object-cover", layout === "list" ? "w-28 shrink-0 sm:w-40" : "w-full")}
                    />
                    {layout === "list" ? (
                      <span className="min-w-0 text-sm font-semibold text-[var(--dpwh-blue)]">
                        Accomplishment {itemIndex + 1}
                        <span className="block text-xs font-normal text-[var(--dpwh-muted)]">Page {item.page} of {count}</span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <p className="okb-public-body text-sm">
        NCR Daily Accomplishment board on{" "}
        <a href={NCR_DAILY_ACCOMPLISHMENT_URL} target="_blank" rel="noopener noreferrer" className="okb-public-link">
          Canva
          <ExternalLink className="ml-1 inline size-3.5 align-[-2px]" aria-hidden />
        </a>
        .
      </p>
    </div>
  );
}
