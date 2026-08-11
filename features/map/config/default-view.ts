import { MAP_DEFAULTS } from "@/lib/constants";
import type { MapViewport } from "@/types/geo";

/** Default national operations viewport (Philippines / NCR focus). */
export const DEFAULT_MAP_VIEW: MapViewport = {
  longitude: MAP_DEFAULTS.longitude,
  latitude: MAP_DEFAULTS.latitude,
  zoom: MAP_DEFAULTS.zoom,
  bearing: 0,
  pitch: 0,
};

/** Full Philippines viewport — country-level zoom for pan/zoom exploration. */
export const PHILIPPINES_MAP_VIEW: MapViewport = {
  longitude: 121.774,
  latitude: 12.8797,
  zoom: 5.8,
  bearing: 0,
  pitch: 0,
};

/** Metro Manila tactical zoom preset. */
export const NCR_MAP_VIEW: MapViewport = {
  longitude: 121.0244,
  latitude: 14.5995,
  zoom: 11,
  bearing: 0,
  pitch: 0,
};

/** Keep the map focused on the Philippine archipelago. */
export const PHILIPPINES_MAX_BOUNDS: [[number, number], [number, number]] = [
  [116.0, 4.2],
  [127.8, 21.6],
];

/** Minimum / maximum zoom constraints — street-level to country-wide. */
export const MAP_ZOOM_LIMITS = {
  min: 4,
  max: 20,
} as const;
