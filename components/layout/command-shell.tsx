"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ROUTES } from "@/lib/constants";

/** Route-aware shell wrapper — dashboard and map routes use full-bleed layout. */
export function CommandShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFullBleed =
    pathname === ROUTES.dashboard ||
    pathname === ROUTES.dashboardAlt ||
    pathname === ROUTES.floodMonitoring ||
    pathname === ROUTES.floodProne ||
    pathname === ROUTES.roads ||
    pathname === ROUTES.drainages ||
    pathname === ROUTES.waterways ||
    pathname === ROUTES.pumpingStations ||
    pathname.startsWith(`${ROUTES.riverBasin}/`);
  // Incidents: a full-screen map on phones (like the overview), the scrolling page from sm up.
  const isFullBleedMobile = pathname === ROUTES.incidents;

  return (
    <AppShell
      fullBleed={isFullBleed || (isFullBleedMobile && "mobile")}
      hideUtilityPanel={isFullBleed}
      mainClassName={
        isFullBleed
          ? pathname === ROUTES.drainages || pathname === ROUTES.pumpingStations
            ? "flex min-h-0 flex-col overflow-hidden"
            : "flex min-h-0 flex-col overflow-y-auto xl:overflow-hidden"
          : isFullBleedMobile
            ? "flex min-h-0 flex-col overflow-hidden sm:block sm:overflow-y-auto"
            : undefined
      }
    >
      {children}
    </AppShell>
  );
}
