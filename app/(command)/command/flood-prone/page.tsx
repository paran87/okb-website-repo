import type { Metadata } from "next";
import { FloodProneMap } from "@/features/flood-prone/components/flood-prone-map";

export const metadata: Metadata = {
  title: "Flood-Prone Areas",
  description:
    "Interactive Philippine map with DEOS Updated Flood Prone Areas 2026 road sections.",
};

export default function FloodPronePage() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border px-4 py-2 md:px-5">
        <h1 className="text-base font-semibold text-foreground">
          Flood-Prone Areas
        </h1>
        <p className="text-xs text-muted-foreground">
          Scroll or use +/- to zoom across the Philippines · 123 NCR flood-prone
          road sections marked
        </p>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <FloodProneMap />
      </div>
    </div>
  );
}
