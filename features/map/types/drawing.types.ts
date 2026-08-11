import type { LngLat } from "@/types/geo";

/** Drawing tool identifiers (future implementation). */
export type DrawTool =
  | "point"
  | "line"
  | "polygon"
  | "circle"
  | "rectangle"
  | "measure-distance"
  | "measure-area"
  | "select";

export interface DrawFeatureDraft {
  id: string;
  tool: DrawTool;
  coordinates: readonly LngLat[];
  complete: boolean;
}

/** Drawing engine contract — implemented in a future phase. */
export interface DrawingEngine {
  setTool: (tool: DrawTool | null) => void;
  getDrafts: () => readonly DrawFeatureDraft[];
  clear: () => void;
  undo: () => void;
  enableSnapping: (enabled: boolean) => void;
}

/** Measurement result (future). */
export interface MeasurementResult {
  type: "distance" | "area";
  value: number;
  unit: string;
  coordinates: readonly LngLat[];
}

/** Measurement service contract — stub today. */
export interface MeasurementEngine {
  startDistance: () => void;
  startArea: () => void;
  cancel: () => void;
  getResult: () => MeasurementResult | null;
}

export const DRAWING_NOT_IMPLEMENTED =
  "Drawing tools are scheduled for a future GIS phase." as const;

export const MEASUREMENT_NOT_IMPLEMENTED =
  "Measurement tools are scheduled for a future GIS phase." as const;
