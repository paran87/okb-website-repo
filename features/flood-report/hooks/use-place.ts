"use client";

import { useEffect, useRef, useState } from "react";
import { fetchPlace } from "../lib/api";
import type { PlaceName } from "../types";

/** Meters between two points (equirectangular; fine at street scale). */
export function distanceM(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = Math.PI / 180;
  const x = (b.longitude - a.longitude) * rad * Math.cos(((a.latitude + b.latitude) / 2) * rad);
  const y = (b.latitude - a.latitude) * rad;
  return Math.sqrt(x * x + y * y) * 6_371_000;
}

/** Street / barangay / city for a GPS position; looked up again only after moving ~40 m. */
export function usePlace(point: { latitude: number; longitude: number } | null): PlaceName | null {
  const [place, setPlace] = useState<PlaceName | null>(null);
  const last = useRef<{ latitude: number; longitude: number } | null>(null);
  const lat = point?.latitude ?? null;
  const lng = point?.longitude ?? null;

  useEffect(() => {
    if (lat === null || lng === null) return;
    const here = { latitude: lat, longitude: lng };
    if (last.current && distanceM(last.current, here) < 40) return;
    const timer = setTimeout(() => {
      last.current = here;
      fetchPlace(lat, lng)
        .then((p) => setPlace(p))
        .catch(() => {
          last.current = null;
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [lat, lng]);

  return place;
}
