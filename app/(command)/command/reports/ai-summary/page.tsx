import type { Metadata } from "next";
import { AiSituationPage } from "@/features/reports/components/report-pages";

export const metadata: Metadata = { title: "AI Situation Summary" };

export default function Page() {
  return <AiSituationPage />;
}
