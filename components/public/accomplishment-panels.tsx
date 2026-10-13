"use client";

import { useEffect, useId, useState } from "react";
import { preconnect } from "react-dom";
import { ExternalLink } from "lucide-react";
import { AccomplishmentDashboard } from "@/components/public/accomplishment-dashboard";
import {
  NCR_DAILY_ACCOMPLISHMENT_EMBED_URL,
  NCR_DAILY_ACCOMPLISHMENT_URL,
} from "@/lib/constants";
import { cn } from "@/utils/cn";

const TABS = [
  { id: "live", label: "Live dashboard" },
  { id: "ncr-daily", label: "NCR Daily Accomplishment" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Accomplishment page: the live monitor, and the NCR daily board on Canva. */
export function AccomplishmentPanels() {
  preconnect("https://www.canva.com");

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

/** The NCR daily board. Canva's editor cannot be framed, so this is the same design's view. */
function NcrDailyAccomplishment() {
  const [ready, setReady] = useState(false);

  return (
    <div className="space-y-3">
      <div className="okb-acc-frame-shell okb-public-card overflow-hidden rounded-sm border shadow-sm">
        <iframe
          src={NCR_DAILY_ACCOMPLISHMENT_EMBED_URL}
          title="NCR Daily Accomplishment"
          className="block aspect-[16/10] h-auto w-full border-0 bg-white sm:aspect-auto sm:h-[min(85vh,1100px)] sm:min-h-[520px]"
          loading="eager"
          allow="fullscreen"
          onLoad={() => setReady(true)}
        />
        <div
          className={cn("okb-acc-loading", ready && "okb-acc-loading--done")}
          role="status"
          aria-live="polite"
          aria-hidden={ready}
        >
          <p className="okb-acc-loading-title">Loading NCR Daily Accomplishment</p>
          <p className="okb-acc-loading-note">Opening the Canva board.</p>
        </div>
      </div>

      <p className="okb-public-body text-sm">
        NCR Daily Accomplishment board on{" "}
        <a
          href={NCR_DAILY_ACCOMPLISHMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="okb-public-link"
        >
          Canva
          <ExternalLink className="ml-1 inline size-3.5 align-[-2px]" aria-hidden />
        </a>
        .
      </p>
    </div>
  );
}
