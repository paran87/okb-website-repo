import type { Metadata } from "next";
import { FloodOverview } from "@/features/flood-monitoring/components/flood-overview";

export const metadata: Metadata = {
  title: "Flood Monitoring",
  description:
    "Active NCR incidents and national flood-prone areas on one live map.",
};

/** Flood Monitoring overview — full-bleed map with floating summaries. */
export default function FloodMonitoringPage() {
  return <FloodOverview />;
}
