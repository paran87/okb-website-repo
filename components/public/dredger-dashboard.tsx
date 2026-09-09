"use client";

import { useEffect, useRef, useState } from "react";
import { preconnect, prefetchDNS } from "react-dom";
import { ExternalLink, RotateCw } from "lucide-react";
import { DASHBOARD_ORIGINS } from "@/lib/config/dashboard-origins";
import { DREDGER_STATUS_DASHBOARD_URL } from "@/lib/constants";
import { cn } from "@/utils/cn";

/** How long to wait before offering the "open in a new tab" escape hatch. */
const SLOW_LOAD_MS = 9000;

/**
 * The frame's load event fires for the Apps Script wrapper document, but the
 * dashboard itself renders a moment later inside a nested sandbox frame that we
 * cannot observe cross-origin. Holding the placeholder briefly past load avoids
 * flashing an empty white panel in that gap.
 */
const PAINT_GRACE_MS = 1200;

const SKELETON_BARS = [64, 88, 52, 96, 74, 40];

const DREDGER_EMBED_PATH = "/dredger-status/embed";

/** Live dredger status dashboard hosted on Google Apps Script. */
export function DredgerDashboard() {
  for (const origin of DASHBOARD_ORIGINS) {
    prefetchDNS(origin);
    preconnect(origin);
  }

  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const graceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, [ready, attempt]);

  useEffect(() => () => {
    if (graceTimer.current) clearTimeout(graceTimer.current);
  }, []);

  const onFrameLoad = () => {
    if (graceTimer.current) clearTimeout(graceTimer.current);
    graceTimer.current = setTimeout(() => setReady(true), PAINT_GRACE_MS);
  };

  const reload = () => {
    if (graceTimer.current) clearTimeout(graceTimer.current);
    setReady(false);
    setSlow(false);
    setAttempt((value) => value + 1);
  };

  return (
    <div className="space-y-3">
      <div className="okb-acc-frame-shell okb-public-card overflow-hidden rounded-sm border shadow-sm">
        <iframe
          key={attempt}
          src={DREDGER_EMBED_PATH}
          title="Oplan Kontra Baha Dredger Status dashboard"
          className="okb-accomplishment-frame block w-full border-0 bg-white"
          loading="eager"
          referrerPolicy="no-referrer"
          allow="fullscreen"
          onLoad={onFrameLoad}
        />

        <div
          className={cn("okb-acc-loading", ready && "okb-acc-loading--done")}
          role="status"
          aria-live="polite"
          aria-hidden={ready}
        >
          <div className="okb-acc-loading-art" aria-hidden>
            <span className="okb-acc-loading-sweep" />
            <div className="okb-acc-loading-bars">
              {SKELETON_BARS.map((height, index) => (
                <span
                  key={index}
                  style={{
                    height: `${height}%`,
                    animationDelay: `${index * 0.12}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <p className="okb-acc-loading-title">Loading the live dashboard</p>
          <p className="okb-acc-loading-note">
            {slow
              ? "Google Apps Script is taking longer than usual to respond. You can keep waiting, reload the frame, or open it in a new tab."
              : "Fetching the latest dredger deployment and status records from the official monitoring sheet."}
          </p>

          {slow ? (
            <div className="okb-acc-loading-actions">
              <button
                type="button"
                onClick={reload}
                className="okb-public-btn okb-public-btn-primary"
              >
                <RotateCw className="size-4" aria-hidden />
                Reload dashboard
              </button>
              <a
                href={DREDGER_STATUS_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="okb-public-btn okb-public-btn-outline"
              >
                <ExternalLink className="size-4" aria-hidden />
                Open in a new tab
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <p className="okb-public-body text-sm">
        Live dashboard from the official{" "}
        <a
          href={DREDGER_STATUS_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="okb-public-link"
        >
          Oplan Kontra Baha Dredger Status
        </a>{" "}
        monitor.
      </p>
    </div>
  );
}
