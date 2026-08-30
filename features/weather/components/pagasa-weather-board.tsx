"use client";

import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Loader2,
  MapPin,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePagasaWeather } from "@/features/weather/hooks/use-pagasa-weather";
import type {
  PagasaIslandGroup,
  PagasaWeatherAdvisory,
  PagasaWeatherCondition,
  PagasaRegionalForecast,
} from "@/features/weather/types";
import { cn } from "@/utils/cn";
import { useMemo, useState } from "react";

const ISLAND_FILTERS: { id: "all" | PagasaIslandGroup; label: string }[] = [
  { id: "all", label: "All Philippines" },
  { id: "luzon", label: "Luzon" },
  { id: "visayas", label: "Visayas" },
  { id: "mindanao", label: "Mindanao" },
];

const CONDITION_META: Record<
  PagasaWeatherCondition,
  { label: string; icon: typeof Sun; tone: string }
> = {
  sunny: { label: "Fair", icon: Sun, tone: "text-weather-sunny" },
  "partly-cloudy": {
    label: "Partly Cloudy",
    icon: CloudSun,
    tone: "text-weather-cloudy",
  },
  cloudy: { label: "Cloudy", icon: Cloud, tone: "text-weather-cloudy" },
  "rain-showers": {
    label: "Rain Showers",
    icon: CloudRain,
    tone: "text-weather-rain",
  },
  rain: { label: "Rain", icon: CloudRain, tone: "text-weather-rain" },
  thunderstorms: {
    label: "Thunderstorms",
    icon: CloudLightning,
    tone: "text-weather-storm",
  },
  "monsoon-rain": {
    label: "Monsoon Rain",
    icon: CloudRain,
    tone: "text-weather-typhoon",
  },
};

const ADVISORY_STYLES: Record<
  PagasaWeatherAdvisory["level"],
  string
> = {
  watch: "border-info/40 bg-info/10",
  alert: "border-warning/40 bg-warning/10",
  warning: "border-danger/40 bg-danger/10",
  signal: "border-danger/50 bg-danger/15",
};

/** PAGASA-style public weather bulletin — live Philippines coverage. */
export function PagasaWeatherBoard() {
  const { data: bulletin, isLoading, isError, isFetching } = usePagasaWeather();
  const [filter, setFilter] = useState<"all" | PagasaIslandGroup>("all");

  const regions = useMemo(() => {
    if (!bulletin) return [];
    return filter === "all"
      ? bulletin.regions
      : bulletin.regions.filter((region) => region.islandGroup === filter);
  }, [bulletin, filter]);

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-card border border-border bg-card">
        <div className="flex items-center gap-3 text-body text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          Loading live PAGASA weather…
        </div>
      </div>
    );
  }

  if (isError || !bulletin) {
    return (
      <div className="rounded-card border border-danger/30 bg-danger/10 p-6 text-body text-foreground">
        Unable to load live PAGASA weather. Please refresh or visit{" "}
        <a
          href="https://www.pagasa.dost.gov.ph/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          pagasa.dost.gov.ph
        </a>
        .
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-card border border-border">
        <div className="border-b border-[#1e4f9c] bg-[#0b3d91] px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-label font-semibold uppercase tracking-[0.18em] text-white/75">
                DOST · PAGASA
              </p>
              <h2 className="mt-1 text-subheading font-bold text-white">
                Public Weather Forecast — Philippines
              </h2>
              <p className="mt-1 text-caption text-white/80">
                Coverage limited to the Philippine Area of Responsibility (PAR)
              </p>
            </div>
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-caption text-white">
              <p>
                <span className="font-semibold">Issued:</span> {bulletin.issuedAt}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Valid:</span>{" "}
                {bulletin.validPeriod}
              </p>
              {isFetching ? (
                <p className="mt-1 text-white/70">Refreshing…</p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-card p-4 sm:p-5">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
            <p className="text-label font-semibold uppercase tracking-wide text-primary">
              Synoptic Situation
            </p>
            <p className="mt-2 text-body leading-relaxed text-foreground">
              {bulletin.synopticSituation}
            </p>
            <p className="mt-3 text-caption leading-relaxed text-muted-foreground">
              {bulletin.generalForecast}
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-subheading text-foreground">
                Weather Advisories
              </h3>
              <span className="text-label text-muted-foreground">
                {bulletin.advisories.length} active
              </span>
            </div>
            {bulletin.advisories.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-3">
                {bulletin.advisories.map((advisory) => (
                  <AdvisoryCard key={advisory.id} advisory={advisory} />
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-border/70 bg-muted/10 px-4 py-6 text-caption text-muted-foreground">
                No active PAGASA warnings at this time.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-subheading text-foreground">
              Regional Forecast
            </h3>
            <p className="text-caption text-muted-foreground">
              24-hour outlook by major Philippine area
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ISLAND_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-label font-semibold transition-colors",
                  filter === item.id
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {regions.map((region) => (
            <RegionForecastCard key={region.id} region={region} />
          ))}
        </div>
      </section>

      <p className="text-label text-muted-foreground">
        Live data sourced from DOST-PAGASA public feeds (
        {bulletin.source === "pagasa-live" ? "updated automatically" : "fallback snapshot"}
        ). Last fetched{" "}
        {new Intl.DateTimeFormat("en-PH", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          day: "numeric",
          month: "short",
          timeZone: "Asia/Manila",
        }).format(new Date(bulletin.fetchedAt))}{" "}
        PHT.
      </p>
    </div>
  );
}

function AdvisoryCard({ advisory }: { advisory: PagasaWeatherAdvisory }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3.5",
        ADVISORY_STYLES[advisory.level],
      )}
    >
      <p className="text-label font-semibold uppercase tracking-wide text-muted-foreground">
        {advisory.type}
      </p>
      <p className="mt-1 text-body font-semibold text-foreground">
        {advisory.headline}
      </p>
      <p className="mt-2 flex items-start gap-1.5 text-caption text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {advisory.areas}
      </p>
      <p className="mt-2 text-caption leading-relaxed text-foreground/90">
        {advisory.detail}
      </p>
      <p className="mt-2 text-label text-muted-foreground">
        Valid until {advisory.validUntil}
      </p>
    </div>
  );
}

function RegionForecastCard({ region }: { region: PagasaRegionalForecast }) {
  const meta = CONDITION_META[region.condition];
  const Icon = meta.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/15 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-body">{region.region}</CardTitle>
            <p className="mt-0.5 text-caption text-muted-foreground">
              {region.areaLabel}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Icon className={cn("size-5", meta.tone)} aria-hidden />
            <span className="text-label font-medium text-foreground">
              {meta.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="grid grid-cols-2 gap-2">
          <Metric
            icon={Thermometer}
            label="Temperature"
            value={`${region.temperatureMin}–${region.temperatureMax} °C`}
          />
          <Metric
            icon={Droplets}
            label="Rainfall"
            value={region.rainfallOutlook}
          />
          <Metric icon={Wind} label="Wind" value={region.wind} />
          <Metric
            icon={CloudRain}
            label="Coastal waters"
            value={region.coastalWaters}
          />
        </div>

        {region.heatIndex ? (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-caption text-warning">
            Heat index may reach {region.heatIndex} °C in urban areas.
          </p>
        ) : null}

        <p className="text-caption leading-relaxed text-muted-foreground">
          {region.forecast}
        </p>
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/10 p-2">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-primary" aria-hidden />
        <span className="text-label text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-caption font-medium leading-snug text-foreground">
        {value}
      </p>
    </div>
  );
}
