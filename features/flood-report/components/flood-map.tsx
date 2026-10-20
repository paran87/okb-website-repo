"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap, MapMouseEvent, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMapStyle } from "@/features/map/config/map-styles";
import { FLOOD_SEVERITY } from "@/features/incident/lib/flood-severity";
import { isStyleReady } from "@/features/map/services/map.service";
import { keepMapDrawn } from "@/features/map/services/map-recovery";
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

/** Where a report's pin sits: halfway along its flooded stretch, else at its reported location. */
export function pinAt(r: Pick<PublicFloodReport, "latitude" | "longitude" | "stretch">): { latitude: number; longitude: number } {
  return r.stretch ? { latitude: r.stretch.mid[1], longitude: r.stretch.mid[0] } : { latitude: r.latitude, longitude: r.longitude };
}

const STRETCH_SOURCE = "okb-flood-stretches";
const STRETCH_HIT = "okb-flood-stretch-hit";

/** The flooded stretches (lines, and a dot at each end where the end photos were taken). */
function stretchData(reports: PublicFloodReport[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  // Oldest first, so the newest stretches are drawn on top.
  for (const r of [...reports].reverse()) {
    if (!r.stretch) continue;
    const properties = { id: r.id, color: reportColor(r), opacity: r.active ? 0.95 : 0.6 };
    features.push({ type: "Feature", geometry: { type: "LineString", coordinates: r.stretch.line }, properties });
    const first = r.stretch.line[0];
    const last = r.stretch.line.at(-1);
    for (const end of [first, last]) if (end) features.push({ type: "Feature", geometry: { type: "Point", coordinates: end }, properties });
  }
  return { type: "FeatureCollection", features };
}

/** Adds the stretch layers under the photo markers (once the style is ready). */
function addStretchLayers(m: MapLibreMap, data: GeoJSON.FeatureCollection) {
  if (m.getSource(STRETCH_SOURCE)) return;
  m.addSource(STRETCH_SOURCE, { type: "geojson", data });
  const line = ["==", ["geometry-type"], "LineString"] as ["==", ["geometry-type"], string];
  const width = (scale: number) => ["interpolate", ["linear"], ["zoom"], 11, 3 * scale, 14, 6 * scale, 17, 12 * scale] as unknown as number;
  m.addLayer({
    id: "okb-flood-stretch-casing",
    type: "line",
    source: STRETCH_SOURCE,
    filter: line,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#ffffff", "line-width": width(1.6), "line-opacity": ["get", "opacity"] },
  });
  m.addLayer({
    id: "okb-flood-stretch-line",
    type: "line",
    source: STRETCH_SOURCE,
    filter: line,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": ["get", "color"], "line-width": width(1), "line-opacity": ["get", "opacity"] },
  });
  m.addLayer({
    id: "okb-flood-stretch-ends",
    type: "circle",
    source: STRETCH_SOURCE,
    filter: ["==", ["geometry-type"], "Point"],
    paint: { "circle-radius": 6, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 2.5 },
  });
  // A wide, invisible line so a finger can tap the stretch.
  m.addLayer({
    id: STRETCH_HIT,
    type: "line",
    source: STRETCH_SOURCE,
    filter: line,
    layout: { "line-cap": "round" },
    paint: { "line-color": "#000000", "line-opacity": 0, "line-width": 28 },
  });
}

export function reportColor(r: Pick<PublicFloodReport, "receded" | "expired" | "severity">): string {
  return r.receded ? RECEDED_COLOR : r.expired ? CLEARED_COLOR : FLOOD_SEVERITY[r.severity].color;
}

const MESSAGE_ICON =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;inset:0;margin:auto" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" width="10" height="10" fill="#fff" aria-hidden="true"><path d="M7 4v16l13-8z"/></svg>';
const SMALL_MESSAGE_ICON =
  '<svg viewBox="0 0 24 24" width="11" height="11" fill="#fff" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

/** Round photo marker ringed in the severity color, with the depth under it (a message icon for WhatsApp / Viber text). */
function markerElement(report: PublicFloodReport, onSelect: (id: string) => void): HTMLElement {
  const root = document.createElement("button");
  root.type = "button";
  root.className = "okb-flood-marker";
  root.setAttribute("aria-label", `${report.source === "okb_mobile" ? "Flood report" : report.source === "viber" ? "Viber flood report" : "WhatsApp flood report"} at ${report.locationText}`);
  root.style.cssText = "display:flex;flex-direction:column;align-items:center;background:none;border:0;padding:0;cursor:pointer;";
  const color = reportColor(report);
  const ring = document.createElement("span");
  ring.style.cssText = `position:relative;display:block;width:46px;height:46px;border-radius:9999px;border:4px solid ${color};background:#e2e8f0 center/cover no-repeat;box-shadow:0 4px 10px rgba(0,0,0,.35);`;
  const photo = report.photos[0];
  // A report with only a video shows the video's first frame, with a play badge.
  const poster = photo ? null : (report.videos.find((v) => v.posterUrl)?.posterUrl ?? null);
  if (photo) ring.style.backgroundImage = `url("${photo.url}")`;
  else if (poster) ring.style.backgroundImage = `url("${poster}")`;
  else if (report.source !== "okb_mobile") {
    // A WhatsApp / Viber report without photos: a message icon instead of a photo.
    ring.style.background = "#f8fafc";
    ring.innerHTML = MESSAGE_ICON;
  }
  if (report.source !== "okb_mobile") {
    const badge = document.createElement("span");
    badge.title = report.source === "viber" ? "Viber report" : "WhatsApp report";
    badge.style.cssText = `position:absolute;left:-6px;bottom:-4px;width:18px;height:18px;border-radius:9999px;background:${report.source === "viber" ? "#7360f2" : "#1fa855"};box-shadow:0 0 0 2px #fff;display:grid;place-items:center;`;
    badge.innerHTML = SMALL_MESSAGE_ICON;
    ring.append(badge);
  }
  if (report.videos.length) {
    const play = document.createElement("span");
    play.title = "Has a video";
    play.style.cssText = `position:absolute;right:-6px;bottom:-4px;width:18px;height:18px;border-radius:9999px;background:#0f172a;box-shadow:0 0 0 2px #fff;display:grid;place-items:center;`;
    play.innerHTML = PLAY_ICON;
    ring.append(play);
  }
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
  if (report.active) {
    // A pulsing ring behind the photo, in the flood's color, to catch the eye (still when motion is reduced).
    const pulse = document.createElement("span");
    pulse.className = "motion-safe:animate-ping";
    pulse.setAttribute("aria-hidden", "true");
    pulse.style.cssText = `position:absolute;top:0;left:50%;margin-left:-23px;width:46px;height:46px;border-radius:9999px;background:${color};opacity:.6;pointer-events:none;`;
    root.append(pulse);
  }
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

/** The default view: every report (and flooded stretch) in one frame, clear of the header and the bottom buttons. */
function frameAll(m: MapLibreMap, maplibre: MapLibre, reports: PublicFloodReport[], duration: number) {
  if (!reports.length) return;
  if (reports.length === 1 && !reports[0]!.stretch) {
    const only = reports[0]!;
    m.easeTo({ center: [only.longitude, only.latitude], zoom: 14, duration });
    return;
  }
  const bounds = new maplibre.LngLatBounds();
  for (const r of reports) {
    const at = pinAt(r);
    bounds.extend([at.longitude, at.latitude]);
    for (const p of r.stretch?.line ?? []) bounds.extend(p);
  }
  m.fitBounds(bounds, { padding: { top: 150, bottom: 80, left: 50, right: 50 }, maxZoom: 15, duration });
}

/** Full-screen map of the public flood reports. */
export function FloodMap({
  reports,
  selectedId,
  onSelect,
  focus,
  user,
  fitKey,
  fitAllSignal = 0,
}: {
  reports: PublicFloodReport[];
  /** Frame all reports again when this changes (another time range). */
  fitKey?: string;
  /** Frame all reports again (animated) each time this number changes. */
  fitAllSignal?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Fly here when it changes (a new report, the user's position, a selected report). */
  focus: {
    latitude: number;
    longitude: number;
    zoom?: number;
    key: string;
    /** Zoom in on this flooded road (its stretch) as far as it fits, with nothing over the map. */
    road?: [number, number][];
  } | null;
  user: { latitude: number; longitude: number } | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef(new Map<string, { marker: Marker; signature: string }>());
  const userMarker = useRef<Marker | null>(null);
  const lib = useRef<MapLibre | null>(null);
  const fitted = useRef(false);
  const select = useRef(onSelect);
  /** 0 until the map is up; a new number for each map instance (a rebuilt map redraws its markers and layers). */
  const [ready, setReady] = useState(0);
  /** Bumped to rebuild the map after the phone took its drawing context in the background. */
  const [generation, setGeneration] = useState(0);
  const resumeView = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const lastFocus = useRef<string | null>(null);

  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    fitted.current = false;
  }, [fitKey]);

  useEffect(() => {
    if (!container.current || map.current) return;
    let cancelled = false;
    let stopWatching: (() => void) | undefined;
    const placed = markers.current;
    void loadMapLibre().then((maplibre) => {
      if (cancelled || !container.current) return;
      lib.current = maplibre;
      const view = resumeView.current;
      resumeView.current = null;
      const m = new maplibre.Map({
        container: container.current,
        style: getMapStyle("light"),
        center: view?.center ?? DEFAULT_CENTER,
        zoom: view?.zoom ?? 11,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      });
      m.touchZoomRotate.disableRotation();
      m.once("load", () =>
        container.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show"),
      );
      map.current = m;
      // Back from the background with a blank map: rebuild it where it was, with its pins and stretches.
      stopWatching = keepMapDrawn(m, () => {
        if (cancelled || map.current !== m) return;
        const c = m.getCenter();
        resumeView.current = { center: [c.lng, c.lat], zoom: m.getZoom() };
        setGeneration((g) => g + 1);
      });
      setReady(generation + 1);
    });
    return () => {
      cancelled = true;
      stopWatching?.();
      map.current?.remove();
      map.current = null;
      // The markers went with the map; the next one gets new ones.
      placed.clear();
      userMarker.current = null;
      setReady(0);
    };
    // A new generation (the drawing context was lost) rebuilds the map.
  }, [generation]);

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
      const at = pinAt(r);
      let spot = spots.find((g) => Math.abs(g.latitude - at.latitude) < SPOT_DEG && Math.abs(g.longitude - at.longitude) < SPOT_DEG);
      if (!spot) {
        spot = { ...at, ids: [] };
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
      const at = pinAt(r);
      const signature = `${r.status}|${r.receded}|${r.expired}|${r.depthM}|${r.photos[0]?.key ?? ""}|${r.videos.length}|${r.source}|${at.latitude},${at.longitude}|${offset.join(",")}`;
      const existing = markers.current.get(r.id);
      if (existing?.signature === signature) continue;
      existing?.marker.remove();
      const element = markerElement(r, (id) => select.current(id));
      const label = element.getAttribute("aria-label") ?? "";
      const marker = new maplibre.Marker({ element, anchor: "bottom", offset }).setLngLat([at.longitude, at.latitude]).addTo(m);
      // MapLibre labels every marker "Map marker" when it is added: keep the report's own label.
      element.setAttribute("aria-label", label);
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
      frameAll(m, maplibre, reports, 0);
    }
  }, [ready, reports, fitKey]);

  // The "show all flooded areas" button.
  const latest = useRef(reports);
  useEffect(() => {
    latest.current = reports;
  }, [reports]);
  useEffect(() => {
    const m = map.current;
    const maplibre = lib.current;
    if (!fitAllSignal || !ready || !m || !maplibre) return;
    frameAll(m, maplibre, latest.current, 600);
  }, [fitAllSignal, ready]);

  // The flooded stretches, drawn as soon as the style is ready (and redrawn when the reports change).
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const data = stretchData(reports);
    const draw = () => {
      if (!isStyleReady(m)) return false;
      const source = m.getSource(STRETCH_SOURCE) as GeoJSONSource | undefined;
      if (source) source.setData(data);
      else addStretchLayers(m, data);
      return true;
    };
    if (draw()) return;
    m.on("style.load", draw);
    return () => {
      m.off("style.load", draw);
    };
  }, [ready, reports]);

  // Tapping a stretch opens its report.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const onTap = (e: MapMouseEvent) => {
      if (!m.getLayer(STRETCH_HIT)) return;
      const hit = m.queryRenderedFeatures(e.point, { layers: [STRETCH_HIT] })[0];
      const id = hit?.properties?.id;
      if (typeof id === "string") select.current(id);
    };
    m.on("click", onTap);
    return () => {
      m.off("click", onTap);
    };
  }, [ready]);

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
    // A rebuilt map keeps its view: only a new focus moves it.
    if (lastFocus.current === focus.key) return;
    lastFocus.current = focus.key;
    fitted.current = true;
    if (focus.road && focus.road.length > 1 && lib.current) {
      const bounds = new lib.current.LngLatBounds();
      for (const p of focus.road) bounds.extend(p);
      m.fitBounds(bounds, { padding: { top: 150, bottom: 110, left: 60, right: 60 }, maxZoom: focus.zoom ?? 18, duration: 900 });
      return;
    }
    m.flyTo({
      center: [focus.longitude, focus.latitude],
      zoom: focus.road ? (focus.zoom ?? 18) : Math.max(m.getZoom(), focus.zoom ?? 15),
      duration: 900,
      // Keep the point visible above the details sheet (no sheet when zooming in on the road).
      offset: [0, focus.road ? 0 : -120],
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
