"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { BarChart3, Globe, Images, LayoutDashboard, Loader2, LogOut, Settings2, Users } from "lucide-react";
import { OkbLogo } from "@/components/brand/okb-logo";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { AdminLogin } from "@/features/admin/components/admin-login";
import { AdminSetup } from "@/features/admin/components/admin-setup";
import { AnalyticsOverview } from "@/features/admin/components/analytics-overview";
import { MediaManager } from "@/features/admin/components/media-manager";
import { VisitorLog } from "@/features/admin/components/visitor-log";
import { useAdminState, useSignOut } from "@/features/admin/hooks/use-admin";
import { cn } from "@/utils/cn";

type Tab = "overview" | "visitors" | "media" | "setup";

const TABS: { id: Tab; label: string; title: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", title: "Visitors at a glance", icon: <BarChart3 className="size-5" aria-hidden /> },
  { id: "visitors", label: "Visitors", title: "Every visit, newest first", icon: <Users className="size-5" aria-hidden /> },
  { id: "media", label: "Media", title: "Photos & videos", icon: <Images className="size-5" aria-hidden /> },
  { id: "setup", label: "Setup", title: "Setup & account", icon: <Settings2 className="size-5" aria-hidden /> },
];

function isTab(value: string): value is Tab {
  return TABS.some((t) => t.id === value);
}

/** The /admin page: sign-in gate, then Overview · Visitors · Media · Setup. */
export function AdminApp() {
  const state = useAdminState();
  const signOut = useSignOut();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    const fromHash = window.location.hash.slice(1);
    if (isTab(fromHash)) setTab(fromHash);
  }, []);

  const go = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0 });
  };

  if (!state.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        {state.error ? (
          <p className="px-4 text-center text-caption">{state.error.message}</p>
        ) : (
          <Loader2 className="size-6 animate-spin" aria-label="Loading" />
        )}
      </div>
    );
  }
  if (!state.data.granted) return <AdminLogin state={state.data} />;

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="admin-shell min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-10">
      <header className="admin-header sticky top-0 z-40 border-b border-border">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16">
          <Link href="/admin" className="flex min-w-0 items-center gap-2.5" onClick={() => go("overview")}>
            <span className="admin-header__emblem">
              <OkbLogo size={30} />
            </span>
            <span className="min-w-0 leading-none">
              <span className="block font-display text-lg font-bold uppercase tracking-wider text-foreground sm:text-xl">
                OKB Admin
              </span>
              <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Website · Command Center
              </span>
            </span>
          </Link>

          <nav aria-label="Admin sections" className="ml-6 hidden items-center gap-1 md:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => go(t.id)}
                aria-current={t.id === tab ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-lg px-3 text-caption font-semibold transition-colors",
                  t.id === tab ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <Link
              href="/"
              aria-label="Open the OKB website"
              className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:w-auto lg:gap-1.5 lg:px-3 lg:text-caption lg:font-semibold"
            >
              <Globe className="size-5 lg:size-4" aria-hidden />
              <span className="hidden lg:inline">Website</span>
            </Link>
            <Link
              href="/command"
              aria-label="Open the Command Center"
              className="flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:w-auto lg:gap-1.5 lg:px-3 lg:text-caption lg:font-semibold"
            >
              <LayoutDashboard className="size-5 lg:size-4" aria-hidden />
              <span className="hidden lg:inline">Command Center</span>
            </Link>
            <ThemeSwitcher />
            <button
              type="button"
              onClick={() => signOut.mutate()}
              aria-label="Sign out"
              className="hidden size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pt-5 sm:pt-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] leading-4 font-semibold uppercase tracking-[0.2em] text-primary">{current.label}</p>
            <h1 className="font-display text-2xl font-bold tracking-wide text-foreground sm:text-3xl">{current.title}</h1>
          </div>
          <p className="hidden shrink-0 text-caption text-muted-foreground sm:block">
            Hi, <span className="font-semibold text-foreground">{state.data.name}</span>
          </p>
        </div>

        {state.data.usingFallbackKey && tab !== "setup" ? (
          <button
            type="button"
            onClick={() => go("setup")}
            className="mb-4 flex min-h-10 w-full items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-left text-caption text-foreground"
          >
            <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden />
            Signed in with the operator key. Set a dedicated admin key — see Setup.
          </button>
        ) : null}

        {tab === "overview" ? <AnalyticsOverview onOpenSetup={() => go("setup")} /> : null}
        {tab === "visitors" ? <VisitorLog onOpenSetup={() => go("setup")} /> : null}
        {tab === "media" ? <MediaManager /> : null}
        {tab === "setup" ? <AdminSetup state={state.data} /> : null}
      </main>

      {/* Phone: thumb-reach bottom navigation. */}
      <nav
        aria-label="Admin sections"
        className="admin-bottom-nav fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => go(t.id)}
            aria-current={t.id === tab ? "page" : undefined}
            className={cn(
              "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
              t.id === tab ? "text-primary" : "text-muted-foreground",
            )}
          >
            {t.id === tab ? <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-primary" aria-hidden /> : null}
            {t.icon}
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
