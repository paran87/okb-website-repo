import type { Metadata } from "next";
import { FloodwatchFrame } from "./floodwatch-frame";

export const metadata: Metadata = {
  title: "Flood Prone Areas",
  description:
    "Live Floodwatch drainage and flood monitoring for the OKB Command Center.",
};

export default function DrainagesPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <FloodwatchFrame />
    </div>
  );
}
