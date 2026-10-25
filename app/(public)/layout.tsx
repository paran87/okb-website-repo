import { GovTopBar, SiteFooter, SiteHeader } from "@/components/public";
import { getCoverage } from "@/features/accomplishment/server/coverage";
import { ReportFloodFab } from "@/features/flood-report/components/report-flood-fab";

/** The footer figures come live from the OKB SSOT sheet (read at most every 10 minutes). */
export const revalidate = 600;

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const coverage = await getCoverage();
  return (
    <div className="okb-public flex min-h-screen flex-col">
      {/* Field photos on the Accomplishment page are served by Google (OKB SSOT photo links). */}
      <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />

      <GovTopBar />
      <SiteHeader />
      <main className="okb-public-main flex-1">{children}</main>
      <SiteFooter coverage={coverage.totals} />
      {/* Phones: the same hideable "Report a flood" button as in the Command Center. */}
      <ReportFloodFab site />
    </div>
  );
}
