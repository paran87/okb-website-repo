import { GovTopBar, SiteFooter, SiteHeader } from "@/components/public";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="okb-public flex min-h-screen flex-col">
      {/* Field photos on the Accomplishment page are served by Google (OKB SSOT photo links). */}
      <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />

      <GovTopBar />
      <SiteHeader />
      <main className="okb-public-main flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
