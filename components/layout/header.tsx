"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CloudSun, Globe, Menu } from "lucide-react";
import { useWeatherSummary } from "@/features/weather/hooks/use-weather-summary";
import { CommandWordmark } from "@/components/brand/command-wordmark";
import { ConnectionIndicator } from "@/components/layout/connection-indicator";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { AppIcons } from "@/lib/config/icons";
import { PUBLIC_ROUTES } from "@/lib/constants";
import { useUiStore } from "@/lib/store/ui.store";
import { useFullscreen } from "@/hooks/use-fullscreen";

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
    <div className="hidden min-w-0 max-w-[16rem] items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 lg:flex xl:max-w-md 2xl:max-w-xl">
      <CloudSun className="size-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-caption font-medium text-foreground">
          {data?.region ?? "Metro Manila"}
        </p>
        <p
          className="truncate text-label text-muted-foreground"
          title={data ? `${data.temperature}${data.temperatureUnit} · ${data.condition}` : undefined}
        >
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
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  return (
    <header className="okb-cc-header relative flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-header px-3 sm:h-16 sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={openMobileSidebar}
          aria-label="Open navigation"
          className="-ml-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </button>

        {/* The sidebar carries the brand from md up; show it here only on small screens. */}
        <CommandWordmark asHeading className="md:hidden" />
      </div>

      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        {/* The public OKB website, in the same tab. */}
        <Link href={PUBLIC_ROUTES.home} className="okb-cc-site">
          <span className="okb-cc-site__pill">
            <span className="okb-cc-site__icon">
              <Globe aria-hidden />
            </span>
            <span className="okb-cc-site__label">OKB Website</span>
            <ArrowRight className="okb-cc-site__arrow" aria-hidden />
            <span className="okb-cc-site__shine" aria-hidden />
          </span>
        </Link>
        <WeatherPlaceholder />
        <LiveClock />

        <div className="hidden items-center gap-2 md:flex">
          <StatusIndicator tone="online" pulse label="System OK" />
          <ConnectionIndicator />
        </div>

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
      </div>
    </header>
  );
}
