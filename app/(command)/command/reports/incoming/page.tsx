import type { Metadata } from "next";
import { IncomingReportsPage } from "@/features/reports/components/report-pages";

export const metadata: Metadata = { title: "Incoming Reports" };

export default function Page() {
  return <IncomingReportsPage />;
}
