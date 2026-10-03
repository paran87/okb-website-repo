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
      compact
      bodyClassName="space-y-1.5"
    >
      <div className="grid grid-cols-2 gap-1.5">
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

      <div className="rounded-md border border-border/60 bg-muted/20 p-1.5">
        <p className="text-[10px] text-muted-foreground">Storm Status</p>
        <div className="mt-0.5 flex items-start justify-between gap-1.5">
          <p className="text-[11px] leading-tight font-medium text-foreground">
            {weather.stormStatus}
          </p>
          <StatusBadge label="Active" status={weather.stormTone} />
        </div>
      </div>

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
    <div className="rounded-md border border-border/60 bg-card/50 p-1.5">
      <div className="flex items-center gap-1">
        <Icon className={cn("size-3", accent)} aria-hidden />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="mt-0.5 font-mono text-xs font-medium text-foreground">
        {value}
      </p>
    </div>
  );
}
