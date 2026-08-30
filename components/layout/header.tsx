"use client";

import { useEffect, useState } from "react";
import { CloudSun, Menu } from "lucide-react";
import { useWeatherSummary } from "@/features/weather/hooks/use-weather-summary";
import { AppLogo } from "@/components/layout/app-logo";
import { ConnectionIndicator } from "@/components/layout/connection-indicator";
import { NotificationBell } from "@/components/layout/notification-bell";
import { QuickSearch } from "@/components/layout/quick-search";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Avatar } from "@/components/ui/avatar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { AppIcons } from "@/lib/config/icons";
import { APP } from "@/lib/constants";
import { ROLE_LABELS, UserRole } from "@/lib/rbac/roles";
import { useUiStore } from "@/lib/store/ui.store";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { cn } from "@/utils/cn";

const DATE_FORMAT = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Manila",
});
const TIME_FORMAT = new Intl.DateTimeFormat("en-PH", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Manila",
});

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden text-right sm:block" suppressHydrationWarning>
      <p className="text-caption text-muted-foreground">
        {now ? DATE_FORMAT.format(now) : "—"}
      </p>
      <p className="font-mono text-body font-medium text-foreground">
        {now ? TIME_FORMAT.format(now) : "--:--:--"}
      </p>
    </div>
  );
}

function WeatherPlaceholder() {
  const { data } = useWeatherSummary();

  return (
    <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 lg:flex">
      <CloudSun className="size-4 text-warning" aria-hidden />
      <div className="leading-tight">
        <p className="text-caption font-medium text-foreground">
          {data?.region ?? "Metro Manila"}
        </p>
        <p className="text-label text-muted-foreground">
          {data
            ? `${data.temperature}${data.temperatureUnit} · ${data.condition}`
            : "Weather · —"}
        </p>
      </div>
    </div>
  );
}

/** Command-center header with situational awareness controls. */
export function Header() {
  const openMobileSidebar = useUiStore((state) => state.openMobileSidebar);
  const toggleUtilityPanel = useUiStore((state) => state.toggleUtilityPanel);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();
  const role = UserRole.ADMINISTRATOR;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-header px-3 sm:h-16 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Open navigation"
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </button>

        <AppLogo showText={false} className="hidden sm:flex" />

        <div className="min-w-0">
          <h1 className="truncate text-subheading font-semibold text-foreground">
            {APP.name}
          </h1>
          <p className="hidden truncate text-label text-muted-foreground md:block">
            {APP.organization} · {APP.program}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <QuickSearch />
        <WeatherPlaceholder />
        <LiveClock />

        <div className="hidden items-center gap-2 md:flex">
          <StatusIndicator tone="online" pulse label="System OK" />
          <ConnectionIndicator />
        </div>

        <NotificationBell count={3} />

        <ThemeSwitcher />

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
        >
          {isFullscreen ? (
            <AppIcons.exitFullscreen className="size-4" aria-hidden />
          ) : (
            <AppIcons.fullscreen className="size-4" aria-hidden />
          )}
        </button>

        <button
          type="button"
          onClick={toggleUtilityPanel}
          aria-label="Toggle utility panel"
          className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:flex"
        >
          <AppIcons.utilityPanelOpen className="size-4" aria-hidden />
        </button>

        <div
          className={cn(
            "flex items-center gap-2 border-l border-border pl-2 sm:pl-3",
          )}
        >
          <Avatar name="Operator" size="sm" />
          <div className="hidden text-right lg:block">
            <p className="text-caption font-medium text-foreground">Operator</p>
            <p className="text-label text-muted-foreground">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
