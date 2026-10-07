import { create } from "zustand";
import type { Map as MapLibreMap } from "maplibre-gl";
import type {
  LayerConfig,
  MapStatus,
  MapStyleId,
  PopupState,
  SelectionState,
} from "@/features/map/types";
import { INITIAL_POPUP_STATE } from "@/features/map/types/popup.types";
import { INITIAL_SELECTION } from "@/features/map/types/event.types";
import { createDefaultLayerRegistry } from "@/features/map/config/layer-registry";
import { NCR_MAP_VIEW } from "@/features/map/config/default-view";
import type { LngLat, MapViewport } from "@/types/geo";

interface MapStore {
  map: MapLibreMap | null;
  status: MapStatus;
  error: string | null;
  styleId: MapStyleId;
  viewport: MapViewport;
  cursorCoords: LngLat | null;
  layers: LayerConfig[];
  popup: PopupState;
  selection: SelectionState;
  scaleLabel: string;
  isLayerPanelOpen: boolean;
  setMap: (map: MapLibreMap | null) => void;
  setStatus: (status: MapStatus, error?: string | null) => void;
  setStyleId: (styleId: MapStyleId) => void;
  setViewport: (viewport: Partial<MapViewport>) => void;
  setCursorCoords: (coords: LngLat | null) => void;
  setScaleLabel: (label: string) => void;
  setPopup: (popup: PopupState) => void;
  closePopup: () => void;
  setSelection: (selection: Partial<SelectionState>) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerPanelOpen: (open: boolean) => void;
  setLayers: (layers: LayerConfig[]) => void;
  resetLayers: () => void;
}

export const useMapStore = create<MapStore>((set) => ({
  map: null,
  status: "idle",
  error: null,
  styleId: "dark",
  viewport: NCR_MAP_VIEW,
  cursorCoords: null,
  layers: createDefaultLayerRegistry(),
  popup: INITIAL_POPUP_STATE,
  selection: INITIAL_SELECTION,
  scaleLabel: "2 km",
  isLayerPanelOpen: false,
  setMap: (map) => set({ map }),
  setStatus: (status, error = null) => set({ status, error }),
  setStyleId: (styleId) => set({ styleId }),
  setViewport: (partial) =>
    set((state) => ({ viewport: { ...state.viewport, ...partial } })),
  setCursorCoords: (cursorCoords) => set({ cursorCoords }),
  setScaleLabel: (scaleLabel) => set({ scaleLabel }),
  setPopup: (popup) => set({ popup }),
  closePopup: () => set({ popup: INITIAL_POPUP_STATE }),
  setSelection: (partial) =>
    set((state) => ({ selection: { ...state.selection, ...partial } })),
  toggleLayerVisibility: (layerId) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer,
      ),
    })),
  setLayerOpacity: (layerId, opacity) =>
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId ? { ...layer, opacity } : layer,
      ),
    })),
  setLayerPanelOpen: (isLayerPanelOpen) => set({ isLayerPanelOpen }),
  setLayers: (layers) => set({ layers }),
  resetLayers: () => set({ layers: createDefaultLayerRegistry() }),
}));

/** Selectors to minimize rerenders in overlay components. */
export const selectViewport = (s: MapStore) => s.viewport;
export const selectMapStatus = (s: MapStore) => s.status;
export const selectLayers = (s: MapStore) => s.layers;
export const selectPopup = (s: MapStore) => s.popup;

/**
 * True when [map] is the map the page currently shows. After a client-side navigation a component can
 * still hold the previous page's map (already removed) for one effect run; calling it then throws
 * ("Cannot read properties of undefined (reading 'getLayer')").
 */
export function isLiveMap(map: MapLibreMap | null | undefined): map is MapLibreMap {
  if (!map || useMapStore.getState().map !== map) return false;
  return Boolean((map as unknown as { style?: unknown }).style);
}

const INERT_METHODS: Record<string, (...args: unknown[]) => unknown> = {
  getLayer: () => undefined,
  getSource: () => undefined,
  getStyle: () => undefined,
  isStyleLoaded: () => false,
  queryRenderedFeatures: () => [],
  querySourceFeatures: () => [],
};
const INERT_NOOPS = [
  "addLayer", "addSource", "removeLayer", "removeSource", "moveLayer", "setFilter", "setLayoutProperty",
  "setPaintProperty", "setStyle", "addImage", "removeImage", "fitBounds", "flyTo", "easeTo", "jumpTo",
  "resize", "setFeatureState", "removeFeatureState",
];

/**
 * Makes a removed map harmless: late calls from components that still hold it (see [isLiveMap]) do
 * nothing instead of throwing and taking the page down.
 */
export function makeRemovedMapInert(map: MapLibreMap): void {
  const target = map as unknown as Record<string, unknown>;
  for (const [name, impl] of Object.entries(INERT_METHODS)) target[name] = impl;
  for (const name of INERT_NOOPS) target[name] = () => map;
}
