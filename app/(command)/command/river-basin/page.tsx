import type { Metadata } from "next";
import { getAllBasinSummaries } from "@/lib/river-basin/summary";
import { BasinDirectory } from "@/features/river-basin/components/basin-directory";
import { PrefetchPdfEngine } from "@/features/river-basin/components/prefetch-pdf-engine";

export const metadata: Metadata = {
  title: "River Basins",
  description:
    "The 18 major river basins: feasibility studies, master plans, basin boundaries and flood-prone areas.",
};

export default function RiverBasinPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <PrefetchPdfEngine />
      <BasinDirectory basins={getAllBasinSummaries()} />
    </div>
  );
}
