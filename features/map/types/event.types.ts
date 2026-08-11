import type { MapLibreEvent, MapMouseEvent } from "maplibre-gl";

/** Supported map event names bridged to React hooks. */
export type MapEventName =
  | "click"
  | "dblclick"
  | "contextmenu"
  | "mousemove"
  | "mouseenter"
  | "mouseleave"
  | "mousedown"
  | "mouseup"
  | "drag"
  | "dragend"
  | "zoom"
  | "move"
  | "rotate"
  | "pitch"
  | "resize"
  | "load"
  | "idle";

export type MapEventHandler<T = MapLibreEvent> = (event: T) => void;

export interface MapClickEvent extends MapMouseEvent {
  features?: GeoJSON.Feature[];
}

export interface SelectionState {
  selectedIds: readonly string[];
  hoveredId: string | null;
}

export const INITIAL_SELECTION: SelectionState = {
  selectedIds: [],
  hoveredId: null,
};
