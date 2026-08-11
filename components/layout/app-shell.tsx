"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ContentArea } from "@/components/layout/content-area";
import { ErrorBoundary } from "@/components/error-boundary";
import { cn } from "@/utils/cn";

const StatusBar = dynamic(
  () =>
    import("@/components/layout/status-bar").then((mod) => ({
      default: mod.StatusBar,
    })),
  { ssr: false },
);

const UtilityPanel = dynamic(
  () =>
    import("@/components/layout/utility-panel").then((mod) => ({
      default: mod.UtilityPanel,
    })),
  { ssr: false },
);

interface AppShellProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  utilityPanel?: ReactNode;
  statusBar?: ReactNode;
  /** Remove max-width padding for map-first pages. */
  fullBleed?: boolean;
  /** Hide the shell utility panel (dashboard has its own side widgets). */
  hideUtilityPanel?: boolean;
  className?: string;
  mainClassName?: string;
}

/**
 * Root application shell: sidebar + header + main content + utility panel +
 * status bar. Used by the `(command)` route group; composable via slots.
 */
export function AppShell({
  children,
  sidebar,
  header,
  utilityPanel,
  statusBar,
  fullBleed = false,
  hideUtilityPanel = false,
  className,
  mainClassName,
}: AppShellProps) {
  return (
    <div className={cn("flex h-screen w-full flex-col overflow-hidden", className)}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {sidebar ?? <Sidebar />}
        <div className="flex min-w-0 flex-1 flex-col">
          {header ?? <Header />}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <main
              className={cn(
                "ops-grid min-h-0 flex-1 overflow-y-auto",
                mainClassName,
              )}
            >
              <ErrorBoundary>
                <ContentArea fullBleed={fullBleed}>{children}</ContentArea>
              </ErrorBoundary>
            </main>
            {!hideUtilityPanel && (utilityPanel ?? <UtilityPanel />)}
          </div>
        </div>
      </div>
      {statusBar ?? <StatusBar />}
    </div>
  );
}
