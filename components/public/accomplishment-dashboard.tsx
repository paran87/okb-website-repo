"use client";

import { ACCOMPLISHMENT_DASHBOARD_URL } from "@/lib/constants";

/** Live accomplishments dashboard hosted on Google Apps Script. */
export function AccomplishmentDashboard() {
  return (
    <div className="space-y-3">
      <div className="okb-public-card overflow-hidden rounded-sm border shadow-sm">
        <iframe
          src={ACCOMPLISHMENT_DASHBOARD_URL}
          title="Oplan Kontra Baha Accomplishments dashboard"
          className="okb-accomplishment-frame block w-full border-0 bg-white"
          loading="eager"
          referrerPolicy="no-referrer"
          allow="fullscreen"
        />
      </div>
      <p className="okb-public-body text-sm">
        Live dashboard from the official{" "}
        <a
          href={ACCOMPLISHMENT_DASHBOARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="okb-public-link"
        >
          Oplan Kontra Baha Accomplishments
        </a>{" "}
        monitor.
      </p>
    </div>
  );
}
