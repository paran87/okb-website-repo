import type { Metadata } from "next";
import { ReportAnalyticsPage } from "@/features/reports/components/report-pages";

export const metadata: Metadata = { title: "Analytics" };

/** Report analytics (Reports → Analytics). */
export default function AnalyticsPage() {
  return <ReportAnalyticsPage />;
}
