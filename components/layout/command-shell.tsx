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
    pathname === ROUTES.floodProne;

  return (
    <AppShell
      fullBleed={isFullBleed}
      hideUtilityPanel={isFullBleed}
      mainClassName={
        isFullBleed ? "flex min-h-0 flex-col overflow-hidden" : undefined
      }
    >
      {children}
    </AppShell>
  );
}
