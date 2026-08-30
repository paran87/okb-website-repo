"use client";

import { useState } from "react";
import { CloudRain, MapPin } from "lucide-react";
import { MapEngine } from "@/features/map/components/map-engine";
import {
  PHILIPPINES_MAP_VIEW,
  PHILIPPINES_MAX_BOUNDS,
} from "@/features/map/config/default-view";
import { WEATHER_BASEMAP_STYLES } from "@/features/map/config/map-styles";
import { createWeatherLayerRegistry } from "@/features/weather/config/layer-registry";
import { WeatherMapLegend } from "@/features/weather/components/weather-map-legend";
import { WeatherRadarOverlay } from "@/features/weather/components/weather-radar-overlay";
import { WeatherCitiesOverlay } from "@/features/weather/components/weather-cities-overlay";
import { MapNorthIndicator } from "@/features/map/components/map-north-indicator";

const WEATHER_LAYERS = createWeatherLayerRegistry();

/** Philippines weather map — vector streets, live radar, and city weather dots. */
export function WeatherMap() {
  const [radarOn, setRadarOn] = useState(true);

  return (
    <section
      className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg ring-1 ring-black/5 dark:ring-white/5"
      aria-label="Philippines weather map"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/25 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Philippines Weather Map
          </h2>
          <p className="text-xs text-muted-foreground">
            OpenFreeMap streets · Esri satellite · 149 city weather dots
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="glass inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-sky-700 shadow-sm dark:text-sky-300">
            <CloudRain className="size-3.5 shrink-0" aria-hidden />
            Rain radar
          </span>
          <span className="glass inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            149 cities
          </span>
        </div>
      </header>

      <div className="relative h-[calc(100dvh-14rem)] min-h-[560px] w-full">
        <MapEngine
          initialView={PHILIPPINES_MAP_VIEW}
          initialStyleId="light"
          initialLayers={WEATHER_LAYERS}
          maxBounds={PHILIPPINES_MAX_BOUNDS}
          lockBasemap
          resetViewPreset="philippines"
          basemapStyles={WEATHER_BASEMAP_STYLES}
          showBasemapSwitcher
          showNorthInControls={false}
          showSearch={false}
          showLayerPanel={false}
          showLegend={false}
          className="absolute inset-0 h-full w-full"
        />
        <WeatherCitiesOverlay />
        <WeatherRadarOverlay enabled={radarOn} onEnabledChange={setRadarOn} />
        <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-col items-end gap-2">
          <MapNorthIndicator />
          <WeatherMapLegend radarOn={radarOn} />
        </div>
      </div>
    </section>
  );
}
