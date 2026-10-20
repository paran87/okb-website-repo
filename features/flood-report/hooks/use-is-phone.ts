"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse), (max-width: 767px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True on phones (touch screen or narrow window); null while rendering on the server. */
export function useIsPhone(): boolean | null {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => null,
  );
}
