"use client";

import { useMapStore, selectPopup } from "@/features/map/store/map.store";

/** Popup open/close state for map feature inspection. */
export function usePopup() {
  const popup = useMapStore(selectPopup);
  const setPopup = useMapStore((s) => s.setPopup);
  const closePopup = useMapStore((s) => s.closePopup);

  return { popup, setPopup, closePopup, isOpen: popup.open };
}
