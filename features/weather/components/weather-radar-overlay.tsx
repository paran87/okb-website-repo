"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudRain } from "lucide-react";
import { reloadOperationalLayers } from "@/features/map/services/map.service";
import { useMapStore } from "@/features/map/store/map.store";
import { cn } from "@/utils/cn";

const RADAR_SOURCE_ID = "weather-radar-source";
const RADAR_LAYER_ID = "weather-radar-layer";
const RADAR_OPACITY = 0.58;

interface RainViewerResponse {
  host?: string;
  radar?: {
    past?: Array<{ time: number; path: string }>;
  };
}

async function fetchLatestRadarTiles(): Promise<string | null> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!res.ok) return null;

    const data = (await res.json()) as RainViewerResponse;
    const frames = data.radar?.past;
    if (!frames?.length) return null;

    const latest = frames[frames.length - 1]!;
    const host = data.host ?? "https://tilecache.rainviewer.com";
    // RainViewer 256px tiles exist only through zoom 7; higher zooms return
    // a "Zoom Level Not Supported" placeholder image.
    return `${host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
  } catch {
    return null;
  }
}

interface WeatherRadarOverlayProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

/** Live global precipitation radar tiles (RainViewer) over the weather map. */
export function WeatherRadarOverlay({
  enabled,
  onEnabledChange,
}: WeatherRadarOverlayProps) {
  const map = useMapStore((s) => s.map);
  const status = useMapStore((s) => s.status);
  const [tileUrl, setTileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const url = await fetchLatestRadarTiles();
      if (!cancelled) {
        setTileUrl(url);
        setLoading(false);
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const applyRadar = useCallback(() => {
    if (!map) return;

    if (map.getLayer(RADAR_LAYER_ID)) map.removeLayer(RADAR_LAYER_ID);
    if (map.getSource(RADAR_SOURCE_ID)) map.removeSource(RADAR_SOURCE_ID);

    if (!enabled || !tileUrl) return;

    map.addSource(RADAR_SOURCE_ID, {
      type: "raster",
      tiles: [tileUrl],
      tileSize: 256,
      maxzoom: 7,
      attribution: "© RainViewer",
    });

    const beforeLayer = map.getLayer("weather-stations-circle")
      ? "weather-stations-circle"
      : undefined;

    map.addLayer(
      {
        id: RADAR_LAYER_ID,
        type: "raster",
        source: RADAR_SOURCE_ID,
        paint: {
          "raster-opacity": RADAR_OPACITY,
          "raster-fade-duration": 0,
        },
      },
      beforeLayer,
    );
  }, [map, enabled, tileUrl]);

  useEffect(() => {
    if (!map || status !== "ready") return;

    applyRadar();

    const onStyleLoad = () => {
      void reloadOperationalLayers(map).then(applyRadar);
    };

    map.on("style.load", onStyleLoad);
    return () => {
      map.off("style.load", onStyleLoad);
    };
  }, [map, status, applyRadar]);

  if (status !== "ready") return null;

  return (
    <div className="pointer-events-none absolute left-3 top-14 z-20">
      <button
        type="button"
        onClick={() => onEnabledChange(!enabled)}
        disabled={!tileUrl && !loading}
        className={cn(
          "glass pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-panel transition-colors",
          enabled && tileUrl
            ? "bg-sky-600/90 text-white hover:bg-sky-600"
            : "text-foreground hover:bg-muted/70",
        )}
        aria-pressed={enabled}
        title={
          tileUrl
            ? "Toggle live precipitation radar"
            : "Radar tiles unavailable"
        }
      >
        <CloudRain className="size-4 shrink-0" aria-hidden />
        {loading ? "Loading radar…" : enabled && tileUrl ? "Radar on" : "Radar off"}
      </button>
    </div>
  );
}
