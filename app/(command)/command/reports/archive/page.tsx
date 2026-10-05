import type { Metadata } from "next";
import { ReportsArchivePage } from "@/features/reports/components/report-pages";

export const metadata: Metadata = { title: "Reports Archive" };

export default function Page() {
  return <ReportsArchivePage />;
}
