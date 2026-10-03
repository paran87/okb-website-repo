import type { Metadata } from "next";
import { FLOODWATCH_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Flood Prone Areas",
  description:
    "Live Floodwatch drainage and flood monitoring for the OKB Command Center.",
};

export default function DrainagesPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
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
