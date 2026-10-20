import type { Map as MapLibreMap, LngLatBoundsLike } from "maplibre-gl";
import type { LayerConfig, MapStyleId } from "@/features/map/types";
import type { MapViewport } from "@/types/geo";
import {
  getDefaultStyleForTheme,
  getMapStyle,
} from "@/features/map/config/map-styles";
import {
  DEFAULT_MAP_VIEW,
  MAP_ZOOM_LIMITS,
  NCR_MAP_VIEW,
  PHILIPPINES_MAP_VIEW,
} from "@/features/map/config/default-view";
import { layerService } from "@/features/map/services/layer.service";
import { useMapStore } from "@/features/map/store/map.store";

/**
 * The basemap style is in, so sources and layers can be added. Unlike map.isStyleLoaded(), this does not
 * also wait for every tile in view to finish loading (many seconds on a slow phone connection).
 */
export function isStyleReady(map: MapLibreMap): boolean {
  return Boolean((map as unknown as { style?: { _loaded?: boolean } }).style?._loaded);
}

/** A phone or tablet (touch is the main input). */
export function isTouchScreen(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** Map instance lifecycle helpers. */
export const mapService = {
  createOptions(
    view: MapViewport,
    styleId: MapStyleId,
    maxBounds?: LngLatBoundsLike,
  ) {
    // Phones and tablets: a lighter renderer (no fade, no antialiasing, at most 2 device pixels per CSS pixel:
    // a 3x screen otherwise draws 2.25 times as many pixels per frame) and a pinch that only zooms (rotation
    // is turned off in MapContainer, two-finger tilt here), so the map keeps up with the fingers.
    const touch = isTouchScreen();
    return {
      container: undefined as unknown as HTMLElement,
      style: getMapStyle(styleId),
      center: [view.longitude, view.latitude] as [number, number],
      zoom: view.zoom,
      bearing: view.bearing ?? 0,
      pitch: view.pitch ?? 0,
      minZoom: MAP_ZOOM_LIMITS.min,
      maxZoom: MAP_ZOOM_LIMITS.max,
      maxBounds,
      attributionControl: false as const,
      fadeDuration: touch ? 0 : 200,
      ...(touch ? { pixelRatio: Math.min(window.devicePixelRatio || 1, 2) } : {}),
      antialias: !touch,
      touchPitch: false,
      pitchWithRotate: false,
      renderWorldCopies: false,
      scrollZoom: true,
      doubleClickZoom: true,
      touchZoomRotate: true,
      dragRotate: true,
      keyboard: true,
    };
  },

  resolveStyleForTheme(theme: string | undefined): MapStyleId {
    return getDefaultStyleForTheme(theme === "light" ? "light" : "dark");
  },

  flyTo(map: MapLibreMap, view: Partial<MapViewport>, duration = 1200): void {
    map.flyTo({
      center: [view.longitude ?? map.getCenter().lng, view.latitude ?? map.getCenter().lat],
      zoom: view.zoom ?? map.getZoom(),
      bearing: view.bearing ?? map.getBearing(),
      pitch: view.pitch ?? map.getPitch(),
      duration,
      essential: true,
    });
  },

  resetView(
    map: MapLibreMap,
    preset: "national" | "ncr" | "philippines" = "ncr",
  ): void {
    const view =
      preset === "philippines"
        ? PHILIPPINES_MAP_VIEW
        : preset === "national"
          ? DEFAULT_MAP_VIEW
          : NCR_MAP_VIEW;
    this.flyTo(map, view);
  },

  fitToFeatureCollection(
    map: MapLibreMap,
    collection: { features: Array<{ geometry: { type: string; coordinates?: unknown } }> },
    options?: { padding?: number; maxZoom?: number; duration?: number },
  ): void {
    let minLng = Infinity;
    let minLat = Infinity;
    let maxLng = -Infinity;
    let maxLat = -Infinity;

    for (const feature of collection.features) {
      if (feature.geometry.type !== "Point" || !feature.geometry.coordinates) {
        continue;
      }
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }

    if (!Number.isFinite(minLng)) return;

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: options?.padding ?? 60,
        maxZoom: options?.maxZoom ?? 12,
        duration: options?.duration ?? 0,
        essential: true,
      },
    );
  },

  setStyle(map: MapLibreMap, styleId: MapStyleId): void {
    map.once("style.load", () => {
      void reloadOperationalLayers(map).catch((error) => {
        console.error("Failed to re-apply layers after basemap change:", error);
      });
    });
    map.setStyle(getMapStyle(styleId), { diff: false });
  },

  getScaleLabel(map: MapLibreMap): string {
    const zoom = map.getZoom();
    if (zoom >= 16) return "100 m";
    if (zoom >= 14) return "250 m";
    if (zoom >= 12) return "500 m";
    if (zoom >= 10) return "2 km";
    if (zoom >= 8) return "10 km";
    if (zoom >= 6) return "50 km";
    return "200 km";
  },
};

/** Re-attaches GeoJSON layers after the basemap style is replaced. */
export async function reloadOperationalLayers(map: MapLibreMap): Promise<void> {
  const layers = useMapStore.getState().layers;
  for (const config of layers) {
    await layerService.ensureSource(map, config);
    layerService.ensureLayers(map, config);
  }
  layerService.reorder(map, layers);
}

export type { LayerConfig };
