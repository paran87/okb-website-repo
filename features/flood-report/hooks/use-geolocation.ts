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

/** A quick first fix (Wi-Fi / cell, or the phone's last known place) is shown only when at least this precise (meters). */
const QUICK_FIX_M = 150;

const toFix = (pos: GeolocationPosition): GeoFix => ({
  latitude: pos.coords.latitude,
  longitude: pos.coords.longitude,
  accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
  at: pos.timestamp,
});

/**
 * Watches the phone's GPS while `active` (high accuracy); keeps the last fix when it stops. Browsers that do not use
 * Google's Wi-Fi and cell location (Brave, Firefox) can need a minute or more for a first GPS fix, so a quick, less
 * precise fix is taken meanwhile when it is good enough; the GPS replaces it as soon as it answers.
 */
export function useGeolocation(active: boolean): GeoState {
  const [state, setState] = useState<GeoState>({ status: "idle", fix: null, error: null });

  useEffect(() => {
    if (!active) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "unavailable", fix: null, error: "This browser cannot read your location." });
      return;
    }
    setState((s) => (s.status === "ready" ? s : { status: "locating", fix: s.fix, error: null }));
    let gps = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix = toFix(pos);
        if (gps || fix.accuracyM === null || fix.accuracyM > QUICK_FIX_M) return;
        setState((s) => (s.status === "ready" ? s : { status: "ready", fix, error: null }));
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
    );
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        gps = true;
        setState({ status: "ready", fix: toFix(pos), error: null });
      },
      (err) =>
        setState((s) => {
          // A slow GPS keeps the quick fix it already has.
          if (err.code !== err.PERMISSION_DENIED && s.status === "ready") return s;
          return {
            status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
            fix: s.fix,
            error:
              err.code === err.PERMISSION_DENIED
                ? "Location is blocked. Allow location for this site so your photos are geotagged."
                : "Waiting for a GPS signal. Move to an open area.",
          };
        }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  return state;
}
