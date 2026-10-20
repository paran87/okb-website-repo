import type { Metadata, Viewport } from "next";
import { FloodReportApp } from "@/features/flood-report/components/flood-report-app";

export const metadata: Metadata = {
  title: "Report a Flood",
  description:
    "Send geotagged photos of a flooded area to the OKB Command Center and see community flood reports on the map.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

/** Mobile-only page (no site header or Command Center sidebar): flood map, camera and report form. */
export default function ReportFloodPage() {
  return <FloodReportApp />;
}
