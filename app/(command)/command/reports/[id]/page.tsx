import type { Metadata } from "next";
import { ReportDetailPage } from "@/features/reports/components/report-pages";

export const metadata: Metadata = { title: "Report Details" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportDetailPage id={id} />;
}
