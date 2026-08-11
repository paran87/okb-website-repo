"use client";

import { useMapStore } from "@/features/map/store/map.store";

/** Feature selection state for interactive layers. */
export function useSelection() {
  const selection = useMapStore((s) => s.selection);
  const setSelection = useMapStore((s) => s.setSelection);

  return {
    ...selection,
    select: (id: string, multi = false) => {
      setSelection({
        selectedIds: multi
          ? [...selection.selectedIds, id]
          : [id],
      });
    },
    deselect: (id: string) => {
      setSelection({
        selectedIds: selection.selectedIds.filter((x) => x !== id),
      });
    },
    clear: () => setSelection({ selectedIds: [], hoveredId: null }),
    hover: (id: string | null) => setSelection({ hoveredId: id }),
  };
}
