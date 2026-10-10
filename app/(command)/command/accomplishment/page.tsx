import type { Metadata } from "next";
import { AccomplishmentLocked } from "@/features/accomplishment/components/accomplishment-locked";
import { AccomplishmentView } from "@/features/accomplishment/components/accomplishment-view";
import { getAccomplishment } from "@/features/accomplishment/server/accomplishment.service";
import { hasOperatorAccess } from "@/features/reports/server/access";

export const metadata: Metadata = {
  title: "Dredging & Desilting Progress",
  description: "Dredging and desilting progress per region, site and waterway (OKB SSOT sheet).",
  robots: { index: false, follow: false },
};

/**
 * Restricted for now: only operators who entered the operator access key (as for Operations) see the page.
 * The sheet itself is read at most every 10 minutes (cached fetch).
 */
export default async function AccomplishmentPage() {
  if (!(await hasOperatorAccess())) return <AccomplishmentLocked />;
  const data = await getAccomplishment();
  return <AccomplishmentView data={data} />;
}
