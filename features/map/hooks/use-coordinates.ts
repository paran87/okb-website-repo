"use client";

import { useCallback } from "react";
import { useMapStore } from "@/features/map/store/map.store";
import { coordinateService } from "@/features/map/services/coordinate.service";
import type { CoordinateFormatOptions } from "@/features/map/types";

/** Mouse / map coordinate readout with formatting helpers. */
export function useCoordinates(options?: CoordinateFormatOptions) {
  const cursorCoords = useMapStore((s) => s.cursorCoords);
  const viewport = useMapStore((s) => s.viewport);

  const format = useCallback(
    (coords: [number, number]) => coordinateService.format(coords, options),
    [options],
  );

  const copyCoordinates = useCallback(async () => {
    if (!cursorCoords) return;
    const formatted = coordinateService.format(cursorCoords, options);
    await navigator.clipboard.writeText(coordinateService.copyText(formatted));
  }, [cursorCoords, options]);

  return {
    cursor: cursorCoords,
    center: [viewport.longitude, viewport.latitude] as [number, number],
    format,
    copyCoordinates,
    formatted: cursorCoords ? format(cursorCoords) : null,
  };
}
