"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/features/map/config/map-styles";
import { FLOOD_SEVERITY } from "@/features/incident/lib/flood-severity";
import { formatDepth } from "../lib/options";
import type { PublicFloodReport } from "../types";

/** Metro Manila, where most reports come from. */
const DEFAULT_CENTER: [number, number] = [121.02, 14.6];
/** Violet: clearly apart from the green, orange and red flood levels. */
export const RECEDED_COLOR = "#7c3aed";
/** No receded time came and its weather time ran out (shown in the history views only). */
export const CLEARED_COLOR = "#94a3b8";
/** Reports closer than this (degrees, ~30 m) count as the same spot on the map. */
const SPOT_DEG = 0.0003;

const loadMapLibre = () => import("maplibre-gl").then((mod) => mod.default);
type MapLibre = Awaited<ReturnType<typeof loadMapLibre>>;

export function reportColor(r: Pick<PublicFloodReport, "receded" | "expired" | "severity">): string {
  return r.receded ? RECEDED_COLOR : r.expired ? CLEARED_COLOR : FLOOD_SEVERITY[r.severity].color;
}

/** Round photo marker ringed in the severity color, with the depth under it. */
function markerElement(report: PublicFloodReport, onSelect: (id: string) => void): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "okb-flood-marker";
  root.setAttribute("aria-label", `Flood report at ${report.locationText}`);
  root.style.cssText = "display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:0;cursor:pointer;";
  const color = reportColor(report);
  const ring = document.createElement("span");
  ring.style.cssText = `position:relative;display:block;width:46px;height:46px;border-radius:9999px;border:4px solid ${color};background:#e2e8f0 center/cover no-repeat;box-shadow:0 4px 10px rgba(0,0,0,.35);`;
  const photo = report.photos[0];
  if (photo) ring.style.backgroundImage = `url("${photo.url}")`;
  if (report.verified) {
    const check = document.createElement("span");
    check.textContent = "✓";
    check.style.cssText =
      "position:absolute;right:-6px;top:-6px;width:18px;height:18px;border-radius:9999px;background:#2563eb;color:#fff;font:700 11px/18px system-ui;text-align:center;box-shadow:0 0 0 2px #fff;";
    ring.append(check);
  }
  const tag = document.createElement("span");
  tag.textContent = report.receded ? "Receded" : report.expired ? "Cleared" : report.depthM !== null ? formatDepth(report.depthM) : "Flood";
  if (!report.active) root.style.opacity = "0.75";
  tag.style.cssText = `margin-top:-6px;padding:1px 7px;border-radius:9999px;background:${color};color:#fff;font:700 11px/16px system-ui;box-shadow:0 2px 4px rgba(0,0,0,.3);white-space:nowrap;`;
  const tip = document.createElement("span");
  tip.style.cssText = `width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid ${color};`;
  root.append(ring, tag, tip);
  root.addEventListener("click", (e) => {
    e.stopPropagation();
    onSelect(report.id);
  });
  return root;
}

function userDot(): HTMLElement {
  const el = document.createElement("span");
  el.style.cssText =
    "display:block;width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25),0 2px 6px rgba(0,0,0,.3);";
  return el;
}

/** Full-screen map of the public flood reports. */
export function FloodMap({
  reports,
  selectedId,
  onSelect,
  focus,
  user,
  fitKey,
}: {
  reports: PublicFloodReport[];
  /** Frame all reports again when this changes (another time range). */
  fitKey?: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Fly here when it changes (a new report, the user's position, a selected report). */
  focus: { latitude: number; longitude: number; zoom?: number; key: string } | null;
  user: { latitude: number; longitude: number } | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; signature: string }>());
  const userMarker = useRef<Marker | null>(null);
  const lib = useRef<MapLibre | null>(null);
  const fitted = useRef(false);
  const select = useRef(onSelect);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    fitted.current = false;
  }, [fitKey]);

  useEffect(() => {
    if (!container.current || map.current) return;
    let cancelled = false;
    void loadMapLibre().then((maplibre) => {
      if (cancelled || !container.current) return;
      lib.current = maplibre;
      const m = new maplibre.Map({
        container: container.current,
        style: getMapStyle("light"),
        center: DEFAULT_CENTER,
        zoom: 11,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.once("load", () =>
        container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"),
      );
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Keep one marker per report; rebuild a marker only when what it shows changes.
  useEffect(() => {
    const m = map.current;
    const maplibre = lib.current;
    if (!ready || !m || !maplibre) return;
    const seen = new Set<string>();
    // Reports from about the same spot (~30 m) are spread in a small ring so each pin can be tapped.
    const spots: { latitude: number; longitude: number; ids: string[] }[] = [];
    const groupOf = new Map<string, string[]>();
    for (const r of reports) {
      let spot = spots.find((g) => Math.abs(g.latitude - r.latitude) < SPOT_DEG && Math.abs(g.longitude - r.longitude) < SPOT_DEG);
      if (!spot) {
        spot = { latitude: r.latitude, longitude: r.longitude, ids: [] };
        spots.push(spot);
      }
      spot.ids.push(r.id);
      groupOf.set(r.id, spot.ids);
    }
    const offsetOf = (r: PublicFloodReport): [number, number] => {
      const group = groupOf.get(r.id) ?? [];
      if (group.length < 2) return [0, 0];
      const angle = -Math.PI / 2 + (2 * Math.PI * group.indexOf(r.id)) / group.length;
      const radius = 22 + 4 * group.length;
      return [Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius)];
    };
    // Oldest first, so the newest reports are drawn on top.
    for (const r of [...reports].reverse()) {
      seen.add(r.id);
      const offset = offsetOf(r);
      const signature = `${r.status}|${r.receded}|${r.expired}|${r.depthM}|${r.photos[0]?.key ?? ""}|${r.latitude},${r.longitude}|${offset.join(",")}`;
      const existing = markers.current.get(r.id);
      if (existing?.signature === signature) continue;
      existing?.marker.remove();
      const marker = new maplibre.Marker({ element: markerElement(r, (id) => select.current(id)), anchor: "bottom", offset })
        .setLngLat([r.longitude, r.latitude])
        .addTo(m);
      markers.current.set(r.id, { marker, signature });
    }
    for (const [id, { marker }] of markers.current) {
      if (!seen.has(id)) {
        marker.remove();
        markers.current.delete(id);
      }
    }
    if (!fitted.current && reports.length) {
      fitted.current = true;
      if (reports.length === 1) {
        m.jumpTo({ center: [reports[0]!.longitude, reports[0]!.latitude], zoom: 14 });
      } else {
        const bounds = new maplibre.LngLatBounds();
        for (const r of reports) bounds.extend([r.longitude, r.latitude]);
        m.fitBounds(bounds, { padding: { top: 140, bottom: 60, left: 50, right: 50 }, maxZoom: 15, duration: 0 });
      }
    }
  }, [ready, reports, fitKey]);

  // Lift the selected marker above the others.
  useEffect(() => {
    for (const [id, { marker }] of markers.current) {
      const el = marker.getElement();
      el.style.zIndex = id === selectedId ? "10" : "";
      // MapLibre positions the marker with its own transform; only the photo ring is scaled.
      (el.firstElementChild as HTMLElement | null)?.style.setProperty("transform", id === selectedId ? "scale(1.18)" : "");
    }
  }, [selectedId, reports]);

  useEffect(() => {
    const m = map.current;
    const maplibre = lib.current;
    if (!ready || !m || !maplibre) return;
    if (!user) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    if (!userMarker.current) userMarker.current = new maplibre.Marker({ element: userDot() }).setLngLat([user.longitude, user.latitude]).addTo(m);
    else userMarker.current.setLngLat([user.longitude, user.latitude]);
  }, [ready, user]);

  const focusKey = focus?.key ?? null;
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !focus) return;
    fitted.current = true;
    m.flyTo({
      center: [focus.longitude, focus.latitude],
      zoom: Math.max(m.getZoom(), focus.zoom ?? 15),
      duration: 900,
      // Keep the point visible above the details sheet.
      offset: [0, -120],
    });
    // Only a new focus key moves the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusKey]);

  return (
    <div className="absolute inset-0">
      <div ref={container} className="size-full" />
    </div>
  );
}
