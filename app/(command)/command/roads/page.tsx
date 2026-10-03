import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { ROAD_NETWORK_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Road Network",
  description: "DPWH road network portfolio for the OKB Command Center.",
};

export default function RoadsPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2 md:px-5">
        <div>
          <h1 className="text-base font-semibold text-foreground">Road Network</h1>
          <p className="text-xs text-muted-foreground">
            DPWH road network portfolio.
          </p>
        </div>
        <a
          href={ROAD_NETWORK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Open in new tab
        </a>
      </header>
      <iframe
        src={ROAD_NETWORK_URL}
        title="DPWH road network portfolio"
        className="min-h-0 w-full flex-1 border-0 bg-background"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="fullscreen; geolocation"
      />
    </div>
  );
}
