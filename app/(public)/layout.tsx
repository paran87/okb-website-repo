import { GovTopBar, SiteFooter, SiteHeader } from "@/components/public";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="okb-public flex min-h-screen flex-col">
      <GovTopBar />
      <SiteHeader />
      <main className="okb-public-main flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}