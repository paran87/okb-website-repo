import { GovTopBar, SiteFooter, SiteHeader } from "@/components/public";
import { DASHBOARD_ORIGINS } from "@/lib/config/dashboard-origins";

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="okb-public flex min-h-screen flex-col">
      {/*
        The accomplishments dashboard is the heaviest thing on the public site
        and it lives on Google's origins. Resolving DNS site-wide means a
        client-side navigation into it does not start from a cold lookup.
      */}
      {DASHBOARD_ORIGINS.map((origin) => (
        <link key={origin} rel="dns-prefetch" href={origin} />
      ))}

      <GovTopBar />
      <SiteHeader />
      <main className="okb-public-main flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
