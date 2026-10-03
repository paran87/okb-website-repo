import type { Metadata } from "next";
import { NcrCriticalAreasView } from "@/features/flood-prone/components/ncr-critical-areas-view";

export const metadata: Metadata = {
  title: "NCR Critical Areas",
  description:
    "Searchable list and map of NCR critical areas from the DEOS Updated Flood Prone Areas 2026 list.",
};

export default function FloodPronePage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <NcrCriticalAreasView />
    </div>
  );
}
