"use client";

import { useMapStore } from "@/features/map/store/map.store";
import { markerService } from "@/features/map/services/popup.service";

/** Marker selection state (backed by map selection store). */
export function useMarker() {
  const selection = useMapStore((s) => s.selection);
  const setSelection = useMapStore((s) => s.setSelection);

  return {
    selectedIds: selection.selectedIds,
    hoveredId: selection.hoveredId,
    select: (id: string) => setSelection({ selectedIds: [id] }),
    clear: () => setSelection({ selectedIds: [], hoveredId: null }),
    setHovered: (hoveredId: string | null) => setSelection({ hoveredId }),
    toneColor: markerService.toneColor,
  };
}
