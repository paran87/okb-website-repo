"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useMapContext } from "@/features/map/context/map-context";
import { makeRemovedMapInert, useMapStore } from "@/features/map/store/map.store";
import { isTouchScreen, mapService } from "@/features/map/services/map.service";
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

/**
 * MapLibre reports per-request failures (a glyph range, a sprite sheet, a
 * single tile) through the same `error` event as unrecoverable ones. Those
 * degrade gracefully on their own, so treating them as fatal would blank an
 * otherwise working map whenever a CDN request hiccups.
 */
const RECOVERABLE_ERROR_HINTS = [
  "glyph",
  "sprite",
  "tile",
  "atlas",
  "image",
  "abort",
];

function isFatalMapError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";
  if (RECOVERABLE_ERROR_HINTS.some((hint) => message.includes(hint))) {
    return false;
  }
  return message.includes("style") || message.includes("webgl");
}

/** Initializes and owns the MapLibre GL JS instance. */
export function MapContainer({ className, onMapReady }: MapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const isReadyRef = useRef(false);
  const appliedThemeRef = useRef<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
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

        // The import above yields, so a Strict Mode remount (or an unmount
        // mid-load) can land here after cleanup already ran. Without this
        // guard a second map is built on the same container and leaked.
        if (cancelled || !containerRef.current || mapRef.current) return;

        const styleId =
          initialStyleId ?? mapService.resolveStyleForTheme(resolvedTheme);

        appliedThemeRef.current = resolvedTheme ?? null;
        useMapStore.getState().setStyleId(styleId);

        const map = new maplibregl.Map({
          ...mapService.createOptions(initialView, styleId, maxBounds),
          container: containerRef.current,
        });
        mapRef.current = map;

        // Phones and tablets: a two-finger pinch only zooms. With rotation on, a pinch whose fingers turn a
        // little also starts turning the map, and the zoom stutters and lands on a tilted bearing.
        if (isTouchScreen()) map.touchZoomRotate.disableRotation();

        // While the map moves, marker animations pause (globals.css): fewer layers to redraw per frame.
        const container = map.getContainer();
        map.on("movestart", () => container.classList.add("okb-map-moving"));
        map.on("moveend", () => container.classList.remove("okb-map-moving"));

        map.addControl(
          new maplibregl.AttributionControl({ compact: true }),
          "bottom-left",
        );

        // Ready as soon as the style is in: the map draws, takes gestures and accepts layers from then on.
        // "load" waits for every tile in view as well, which on a slow phone connection kept the loading
        // overlay (and its touch block) up for many seconds; it stays as a fallback.
        let started = false;
        // Phones: credits start collapsed behind their "i" button, so they do not cover the map controls.
        const collapseCredits = () => {
          if (map.getContainer().offsetWidth > 640) return;
          map
            .getContainer()
            .querySelector(".maplibregl-ctrl-attrib.maplibregl-compact")
            ?.classList.remove("maplibregl-compact-show");
        };
        const onReady = async () => {
          if (cancelled || started) return;
          started = true;
          try {
            const activeLayers = useMapStore.getState().layers;
            for (const config of activeLayers) {
              await layerService.ensureSource(map, config);
              layerService.ensureLayers(map, config);
            }
            layerService.reorder(map, activeLayers);
          } catch (err) {
            // The basemap is already usable and MapLayerRenderer re-runs the
            // registry as soon as status flips to ready, so a data hiccup here
            // must not replace a working map with an error panel.
            console.error("Failed to hydrate map layers:", err);
          }

          if (cancelled) return;
          collapseCredits();
          setScaleLabel(mapService.getScaleLabel(map));
          map.resize();
          isReadyRef.current = true;
          setStatus("ready");
          onMapReady?.(map);
        };
        map.once("style.load", () => void onReady());
        map.once("load", () => {
          void onReady();
          if (!cancelled) collapseCredits();
        });

        map.on("error", (e) => {
          // Once the basemap is up, nothing MapLibre reports here is worth
          // replacing a usable map with a full-panel error.
          if (cancelled || isReadyRef.current) return;
          if (!isFatalMapError(e.error)) return;
          setStatus("error", e.error?.message ?? "Map error");
        });

        // The store feeds React components (scale bar, north arrow). Updating it on every frame of a pan or
        // pinch re-renders them while the map is being drawn, which is what made the map lag. Update it at
        // most ~7 times a second while moving, and once more when the gesture ends.
        let lastSync = 0;
        let pending: number | undefined;
        const syncViewport = () => {
          pending = undefined;
          if (cancelled || mapRef.current !== map) return;
          lastSync = performance.now();
          const center = map.getCenter();
          setViewport({
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
          });
          setScaleLabel(mapService.getScaleLabel(map));
        };
        map.on("move", () => {
          if (pending !== undefined) return;
          const wait = Math.max(0, 140 - (performance.now() - lastSync));
          pending = window.setTimeout(syncViewport, wait);
        });
        map.on("moveend", () => {
          if (pending !== undefined) window.clearTimeout(pending);
          syncViewport();
        });

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
      isReadyRef.current = false;
      resizeObserver?.disconnect();
      const removed = mapRef.current;
      if (removed) {
        removed.remove();
        // Overlays of the page being left may still call it once: make that harmless.
        makeRemovedMapInert(removed);
      }
      mapRef.current = null;
      setMap(null);
      setStatus("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild only on retry
  }, [reloadToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || lockBasemap) return;
    // An explicit style is a deliberate choice by the host page, and a basemap
    // the user picked themselves should survive unrelated rerenders — so only
    // react to the theme actually changing.
    if (initialStyleId || !resolvedTheme) return;
    if (appliedThemeRef.current === resolvedTheme) return;

    appliedThemeRef.current = resolvedTheme;
    const styleId = mapService.resolveStyleForTheme(resolvedTheme);
    useMapStore.getState().setStyleId(styleId);
    mapService.setStyle(map, styleId);
  }, [resolvedTheme, status, lockBasemap, initialStyleId]);

  const handleRetry = useCallback(() => setReloadToken((n) => n + 1), []);

  return (
    <div className={cn("relative h-full w-full min-h-[320px]", className)}>
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full [&_.maplibregl-canvas]:outline-none"
        aria-label="Map"
      />
      {status === "loading" ? <MapLoading /> : null}
      {status === "error" ? (
        <MapError message={error ?? undefined} onRetry={handleRetry} />
      ) : null}
      {status === "ready" ? (
        <>
          <MapLayerRenderer />
          <MapEventBridge />
        </>
      ) : null}
    </div>
  );
}
