"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronLeft, X } from "lucide-react";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";
import { fetchReports } from "../lib/api";

const HIDDEN_KEY = "okb-report-fab-hidden";
const TIP_KEY = "okb-report-fab-tip-seen";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the choice lasts for this visit only */
  }
}

/**
 * Phones: the floating "Report a flood" button over every Command Center page and the public website (the mobile report page is a
 * highlight of the site). It shows how many places are flooded now, shrinks to a round camera button while
 * a page scrolls down, and can be tucked into a small tab at the screen edge (remembered on this phone).
 * The first visit shows a one-time tip. Hidden from md up, where the sidebar links to the page.
 * On full-screen map pages it stays round, so it does not cover the map's own panels. `site` places it for the
 * public website, which has no Command Center bottom bar to clear.
 */
export function ReportFloodFab({ round = false, site = false }: { round?: boolean; site?: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);
  const [tip, setTip] = useState(false);
  const lastY = useRef(new WeakMap<EventTarget, number>());

  useEffect(() => {
    setMounted(true);
    setHidden(read(HIDDEN_KEY) === "1");
    if (read(TIP_KEY) !== "1") {
      const show = setTimeout(() => setTip(true), 1200);
      return () => clearTimeout(show);
    }
  }, []);

  useEffect(() => {
    if (!tip) return;
    const t = setTimeout(() => {
      setTip(false);
      write(TIP_KEY, "1");
    }, 9000);
    return () => clearTimeout(t);
  }, [tip]);

  // Round while a page scrolls down, full again when it scrolls up. Pages scroll inside their own containers,
  // so scroll events are caught on the way down (capture).
  useEffect(() => {
    const onScroll = (e: Event) => {
      const el = e.target instanceof HTMLElement ? e.target : document.scrollingElement;
      if (!el || el.closest?.(".maplibregl-map")) return;
      const y = el.scrollTop;
      const prev = lastY.current.get(el) ?? 0;
      if (Math.abs(y - prev) < 12) return;
      setScrolledDown(y > prev && y > 40);
      lastY.current.set(el, y);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  // Places flooded now (reports from the mobile page still on the map); refreshed every 2 minutes.
  const reports = useQuery({
    queryKey: ["flood-reports", "public", 6],
    queryFn: () => fetchReports(6),
    refetchInterval: 120_000,
    staleTime: 60_000,
    enabled: mounted && !hidden,
  });
  const flooded = (reports.data?.reports ?? []).filter((r) => r.active && (!r.clearsAt || Date.parse(r.clearsAt) > Date.now())).length;

  const closeTip = () => {
    setTip(false);
    write(TIP_KEY, "1");
  };

  if (!mounted) return null;
  const compact = round || scrolledDown;

  const bottom = site ? "calc(1rem + env(safe-area-inset-bottom))" : "calc(2.75rem + env(safe-area-inset-bottom))";

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => {
          setHidden(false);
          write(HIDDEN_KEY, null);
        }}
        aria-label="Show the Report a flood button"
        className="fixed right-0 z-40 flex h-12 w-9 items-center justify-center gap-0.5 rounded-l-xl bg-[#e41b1b] text-white shadow-lg ring-1 ring-black/10 active:bg-[#c51616] md:hidden"
        style={{ bottom }}
      >
        <ChevronLeft className="size-3.5" aria-hidden />
        <Camera className="size-4" aria-hidden />
      </button>
    );
  }

  return (
    <div className="fixed right-3 z-40 flex flex-col items-end gap-2 md:hidden" style={{ bottom }}>
      {tip ? (
        <div role="status" className="relative w-64 rounded-2xl bg-white p-3 pr-10 text-sm text-slate-800 shadow-2xl ring-1 ring-black/10">
          <p className="font-bold text-slate-900">See a flooded street?</p>
          <p className="mt-0.5">Take geotagged photos with your phone and send them to the OKB Command Center. It takes a minute.</p>
          <button
            type="button"
            onClick={closeTip}
            aria-label="Close the tip"
            className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
          >
            <X className="size-4" aria-hidden />
          </button>
          <span className="absolute -bottom-1.5 right-8 size-3 rotate-45 bg-white" aria-hidden />
        </div>
      ) : null}
      <div className="flex items-center gap-1.5">
        {!scrolledDown ? (
          <button
            type="button"
            onClick={() => {
              setHidden(true);
              setTip(false);
              write(HIDDEN_KEY, "1");
              write(TIP_KEY, "1");
            }}
            aria-label="Hide the Report a flood button"
            className="flex size-10 items-center justify-center rounded-full bg-black/70 text-white shadow-md backdrop-blur active:bg-black/85"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        {/* A full page load, so the camera page never runs in a document kept from another page. */}
        <a
          href={PUBLIC_ROUTES.reportFlood}
          onClick={closeTip}
          aria-label={`Report a flood${flooded ? ` (${flooded} flooded now)` : ""}`}
          className={cn(
            "relative flex items-center gap-2.5 rounded-full bg-[#e41b1b] text-white shadow-[0_8px_24px_rgba(228,27,27,0.45)] ring-2 ring-white/90 transition-all duration-300 active:scale-95 active:bg-[#c51616]",
            compact ? "size-14 justify-center" : "h-14 pl-2 pr-4",
          )}
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-[#e41b1b] motion-safe:animate-ping motion-safe:[animation-duration:2.5s] opacity-30" aria-hidden />
          <span className={cn("relative flex shrink-0 items-center justify-center rounded-full", compact ? "size-14" : "size-10 bg-white/20")}>
            <Camera className="size-6" aria-hidden />
            {flooded ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fcd116] px-1 text-[11px] font-bold text-[#001a3a] ring-2 ring-[#e41b1b]">
                {flooded}
              </span>
            ) : null}
          </span>
          {!compact ? (
            <span className="relative flex flex-col leading-tight">
              <span className="text-[15px] font-bold">Report a flood</span>
              <span className="text-[11px] font-medium text-white/85">
                {flooded ? `${flooded} flooded now · see the map` : "Send geotagged photos"}
              </span>
            </span>
          ) : null}
        </a>
      </div>
    </div>
  );
}
