"use client";

import { useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useMapContext } from "@/features/map/context/map-context";
import { useMapStore } from "@/features/map/store/map.store";
import { mapService } from "@/features/map/services/map.service";
import { layerService } from "@/features/map/services/layer.service";
import { MapLayerRenderer } from "@/features/map/components/map-layer-renderer";
import { MapEventBridge } from "@/features/map/components/map-event-bridge";
import { MapLoading } from "@/features/map/components/map-loading";
import { MapError } from "@/features/map/components/map-error";
import { cn } from "@/utils/cn";
import "maplibre-gl/dist/maplibre-gl.css";

interface MapContainerProps {
  className?: string;
  onMapReady?: (map: MapLibreMap) => void;
}

function isFatalMapError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  return (
    message.includes("style") ||
    message.includes("glyph") ||
    message.includes("sprite") ||
    message.includes("webgl")
  );
}

/** Initializes and owns the MapLibre GL JS instance. */
export function MapContainer({ className, onMapReady }: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const { initialView, initialStyleId, options } = useMapContext();
  const maxBounds = options.maxBounds;
  const lockBasemap = options.lockBasemap ?? false;
  const { resolvedTheme } = useTheme();
  const status = useMapStore((s) => s.status);
  const error = useMapStore((s) => s.error);
  const setMap = useMapStore((s) => s.setMap);
  const setStatus = useMapStore((s) => s.setStatus);
  const setViewport = useMapStore((s) => s.setViewport);
  const setScaleLabel = useMapStore((s) => s.setScaleLabel);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    async function init() {
      if (!containerRef.current || mapRef.current) return;

      setStatus("loading");
      try {
        const maplibregl = (await import("maplibre-gl")).default;
        const styleId =
          initialStyleId ??
          mapService.resolveStyleForTheme(resolvedTheme ?? "dark");

        useMapStore.getState().setStyleId(styleId);

        const map = new maplibregl.Map({
          ...mapService.createOptions(initialView, styleId, maxBounds),
          container: containerRef.current,
        });

        map.addControl(
          new maplibregl.AttributionControl({ compact: true }),
          "bottom-left",
        );

        map.on("load", async () => {
          if (cancelled) return;
          try {
            const activeLayers = useMapStore.getState().layers;
            for (const config of activeLayers) {
              await layerService.ensureSource(map, config);
              layerService.ensureLayers(map, config);
            }
            layerService.reorder(map, activeLayers);
            setScaleLabel(mapService.getScaleLabel(map));
            map.resize();
            setStatus("ready");
            onMapReady?.(map);
          } catch (err) {
            setStatus(
              "error",
              err instanceof Error ? err.message : "Failed to load map layers",
            );
          }
        });

        map.on("error", (e) => {
          if (cancelled || !isFatalMapError(e.error)) return;
          setStatus("error", e.error?.message ?? "Map error");
        });

        map.on("move", () => {
          const center = map.getCenter();
          setViewport({
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
          });
          setScaleLabel(mapService.getScaleLabel(map));
        });

        mapRef.current = map;
        setMap(map);

        resizeObserver = new ResizeObserver(() => {
          if (!mapRef.current) return;
          mapRef.current.resize();
        });
        resizeObserver.observe(containerRef.current);
      } catch (err) {
        setStatus(
          "error",
          err instanceof Error ? err.message : "Failed to load map",
        );
      }
    }

    void init();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      setMap(null);
      setStatus("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || lockBasemap) return;

    const styleId = mapService.resolveStyleForTheme(resolvedTheme ?? "dark");
    useMapStore.getState().setStyleId(styleId);
    mapService.setStyle(map, styleId);
  }, [resolvedTheme, status, lockBasemap]);

  return (
    <div className={cn("relative h-full w-full min-h-[320px]", className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full [&_.maplibregl-canvas]:outline-none"
        aria-label="Map"
      />
      {status === "loading" ? <MapLoading /> : null}
      {status === "error" ? <MapError message={error ?? undefined} /> : null}
      {status === "ready" ? (
        <>
          <MapLayerRenderer />
          <MapEventBridge />
        </>
      ) : null}
    </div>
  );
}
