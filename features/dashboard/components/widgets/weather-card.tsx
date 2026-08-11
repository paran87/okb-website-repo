"use client";

import {
  CloudRain,
  Droplets,
  Thermometer,
  Wind,
} from "lucide-react";
import { WidgetContainer } from "@/features/dashboard/components/widgets/widget-container";
import { StatusBadge } from "@/features/dashboard/components/widgets/status-badge";
import type { WeatherSummary } from "@/features/dashboard/types";
import { cn } from "@/utils/cn";

interface WeatherCardProps {
  weather: WeatherSummary;
  className?: string;
}

/** Weather summary widget for the operations dashboard. */
export function WeatherCard({ weather, className }: WeatherCardProps) {
  return (
    <WidgetContainer
      title="Weather"
      subtitle={weather.region}
      icon={<CloudRain className="size-4" aria-hidden />}
      className={className}
      bodyClassName="space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <MetricTile
          icon={CloudRain}
          label="Rainfall"
          value={`${weather.rainfall} ${weather.rainfallUnit}`}
          accent="text-info"
        />
        <MetricTile
          icon={Thermometer}
          label="Temperature"
          value={`${weather.temperature}${weather.temperatureUnit}`}
          accent="text-warning"
        />
        <MetricTile
          icon={Wind}
          label="Wind Speed"
          value={`${weather.windSpeed} ${weather.windUnit}`}
          accent="text-primary"
        />
        <MetricTile
          icon={Droplets}
          label="Humidity"
          value={`${weather.humidity}%`}
          accent="text-success"
        />
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
        <p className="text-label text-muted-foreground">Storm Status</p>
        <div className="mt-1 flex items-start justify-between gap-2">
          <p className="text-caption font-medium text-foreground">
            {weather.stormStatus}
          </p>
          <StatusBadge label="Active" status={weather.stormTone} />
        </div>
      </div>

      <p className="text-label text-muted-foreground">
        Updated {weather.updatedAt}
      </p>
    </WidgetContainer>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof CloudRain;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-2">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5", accent)} aria-hidden />
        <span className="text-label text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 font-mono text-body font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}
