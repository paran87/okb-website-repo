"use client";

import { measurementService } from "@/features/map/services/popup.service";
import {
  DRAWING_NOT_IMPLEMENTED,
  MEASUREMENT_NOT_IMPLEMENTED,
} from "@/features/map/types/drawing.types";

/** Measurement tools stub — interfaces prepared for future Draw / Turf integration. */
export function useMeasurement() {
  return {
    isSupported: false,
    notImplementedMessage: MEASUREMENT_NOT_IMPLEMENTED,
    drawingNotImplementedMessage: DRAWING_NOT_IMPLEMENTED,
    startDistance: measurementService.startDistance,
    startArea: measurementService.startArea,
    cancel: measurementService.cancel,
    result: measurementService.getResult(),
  };
}
