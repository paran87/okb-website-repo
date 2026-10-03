import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { FLOODWATCH_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Drainages",
  description:
    "Live Floodwatch drainage and flood monitoring for the OKB Command Center.",
};

export default function DrainagesPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2 md:px-5">
        <div>
          <h1 className="text-base font-semibold text-foreground">Drainages</h1>
          <p className="text-xs text-muted-foreground">
            Live Floodwatch drainage and flood monitoring.
          </p>
        </div>
        <a
          href={FLOODWATCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Open in new tab
        </a>
      </header>
      <iframe
        src={FLOODWATCH_URL}
        title="Floodwatch drainage monitoring"
        className="min-h-0 w-full flex-1 border-0 bg-background"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="fullscreen; geolocation"
      />
    </div>
  );
}
