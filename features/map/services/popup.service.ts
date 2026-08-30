import type { Feature } from "geojson";
import type { PopupContent, PopupState } from "@/features/map/types";
import { INITIAL_POPUP_STATE } from "@/features/map/types/popup.types";

/** Space left between the clicked feature and the popup body. */
const POINTER_GAP = 12;
/** Breathing room kept between the popup and the edges of the map panel. */
const EDGE_MARGIN = 8;

export interface Size {
  width: number;
  height: number;
}

export interface PopupPlacement {
  left: number;
  top: number;
}

function clamp(value: number, min: number, max: number): number {
  // A popup larger than the panel it sits in would invert the bounds.
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/** Builds popup content from a GeoJSON feature (no business rules). */
export const popupService = {
  fromFeature(feature: Feature): PopupContent {
    const props = feature.properties ?? {};
    const coords =
      feature.geometry.type === "Point"
        ? (feature.geometry.coordinates as [number, number])
        : undefined;

    const weatherDescription = props.advisoryType
      ? `${String(props.advisoryType)} · Valid until ${String(props.validUntil ?? "—")}`
      : props.rainfall
        ? `${String(props.rainfall)} · ${String(props.temperature ?? "—")}°C · Wind ${String(props.wind ?? "—")}`
        : undefined;

    return {
      title: String(props.title ?? props.name ?? "Map Feature"),
      description: props.description
        ? String(props.description)
        : weatherDescription ?? (props.status
          ? `Status: ${String(props.status)}`
          : undefined),
      status: props.status ? String(props.status) : undefined,
      statusTone: mapStatusTone(props.priority ? String(props.priority) : undefined),
      coordinates: coords,
      metadata: Object.fromEntries(
        Object.entries(props)
          .filter(([key]) => !["title", "description", "status"].includes(key))
          .slice(0, 6)
          .map(([k, v]) => [k, String(v)]),
      ),
    };
  },

  createState(
    feature: Feature,
    lngLat: [number, number],
    screenPoint: { x: number; y: number },
  ): PopupState {
    return {
      open: true,
      lngLat,
      screenPoint,
      feature,
      content: this.fromFeature(feature),
    };
  },

  closed(): PopupState {
    return { ...INITIAL_POPUP_STATE };
  },

  /**
   * Keeps the popup inside the map panel: centred on the feature, sitting above
   * it by preference, flipped underneath when the feature is too close to the
   * top, and clamped so no edge is ever cut off.
   */
  place(
    point: { x: number; y: number },
    popup: Size,
    panel: Size,
  ): PopupPlacement {
    const left = clamp(
      point.x - popup.width / 2,
      EDGE_MARGIN,
      panel.width - popup.width - EDGE_MARGIN,
    );

    const above = point.y - POINTER_GAP - popup.height;
    const top = clamp(
      above >= EDGE_MARGIN ? above : point.y + POINTER_GAP,
      EDGE_MARGIN,
      panel.height - popup.height - EDGE_MARGIN,
    );

    return { left, top };
  },
};

function mapStatusTone(
  priority?: string,
): PopupContent["statusTone"] {
  switch (priority) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "default";
  }
}

/** Marker helpers for future DOM overlay markers. */
export const markerService = {
  toneColor(tone: string): string {
    const map: Record<string, string> = {
      default: "#3b82f6",
      flood: "#ef4444",
      critical: "#dc2626",
      equipment: "#8b5cf6",
      warning: "#f59e0b",
      success: "#22c55e",
      offline: "#6b7280",
    };
    return map[tone] ?? map.default!;
  },
};

/** Measurement stub — future MapLibre Draw / Turf.js integration. */
export const measurementService = {
  startDistance(): void {
    /* future */
  },
  startArea(): void {
    /* future */
  },
  cancel(): void {
    /* future */
  },
  getResult(): null {
    return null;
  },
};
