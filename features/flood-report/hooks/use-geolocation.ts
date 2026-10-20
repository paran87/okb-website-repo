"use client";

import { useEffect, useState } from "react";

export interface GeoFix {
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  at: number;
}

export type GeoState =
  | { status: "idle" | "locating"; fix: GeoFix | null; error: null }
  | { status: "ready"; fix: GeoFix; error: null }
  | { status: "denied" | "unavailable"; fix: GeoFix | null; error: string };

/** Watches the phone's GPS while `active` (high accuracy); keeps the last fix when it stops. */
export function useGeolocation(active: boolean): GeoState {
  const [state, setState] = useState<GeoState>({ status: "idle", fix: null, error: null });

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", fix: null, error: "This browser cannot read your location." });
      return;
    }
    setState((s) => (s.status === "ready" ? s : { status: "locating", fix: s.fix, error: null }));
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setState({
          status: "ready",
          fix: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
            at: pos.timestamp,
          },
          error: null,
        }),
      (err) =>
        setState((s) => ({
          status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
          fix: s.fix,
          error:
            err.code === err.PERMISSION_DENIED
              ? "Location is blocked. Allow location for this site so your photos are geotagged."
              : "Waiting for a GPS signal. Move to an open area.",
        })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  return state;
}
