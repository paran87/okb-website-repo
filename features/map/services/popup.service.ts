import type { Feature } from "geojson";
import type { PopupContent, PopupState } from "@/features/map/types";
import { INITIAL_POPUP_STATE } from "@/features/map/types/popup.types";

/** Builds popup content from a GeoJSON feature (no business rules). */
export const popupService = {
  fromFeature(feature: Feature): PopupContent {
    const props = feature.properties ?? {};
    const coords =
      feature.geometry.type === "Point"
        ? (feature.geometry.coordinates as [number, number])
        : undefined;

    return {
      title: String(props.title ?? props.name ?? "Map Feature"),
      description: props.description
        ? String(props.description)
        : props.status
          ? `Status: ${String(props.status)}`
          : undefined,
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
