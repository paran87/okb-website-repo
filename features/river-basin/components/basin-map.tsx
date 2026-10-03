"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, MultiPolygon, Point } from "geojson";
import {
  Crosshair,
  Droplets,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Waves,
  X,
} from "lucide-react";
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent,
} from "maplibre-gl";
import type { ApiSuccess } from "@/lib/api/response";
import {
  featuresForBasin,
  getBasinFacts,
  loadBasinBoundaries,
  loadCriticalWatersheds,
  pointInBasin,
} from "@/lib/river-basin/geo";
import { cn } from "@/utils/cn";
import { floodProneService } from "@/features/flood-prone/services/flood-prone.service";
import { MapEngine } from "@/features/map/components/map-engine";
import {
  MAP_LABEL_FONT,
  WEATHER_BASEMAP_STYLES,
} from "@/features/map/config/map-styles";
import { useMapStore } from "@/features/map/store/map.store";

const BASIN_COLOR = "#0284c7";
const SHED_COLOR = "#d97706";
const AREA_COLOR = "#7c3aed";
const INCIDENT_COLOR = "#dc2626";

type LayerKey = "focus" | "watersheds" | "floodProne" | "incidents" | "others";

type Identified =
  | { kind: "watershed"; name: string; region: string; hectares: number }
  | { kind: "flood-prone"; title: string; description: string; status: string }
  | { kind: "incident"; title: string; description: string };

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function worldMask(basin: Feature<MultiPolygon>[]): FeatureCollection {
  const holes = basin.flatMap((f) =>
    f.geometry.coordinates.map((polygon) => polygon[0] ?? []),
  );
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-180, -85],
              [180, -85],
              [180, 85],
              [-180, 85],
              [-180, -85],
            ],
            ...holes,
          ],
        },
      },
    ],
  };
}

interface BasinMapProps {
  slug: string;
  label: string;
}

/** "Show Map" tab: basin boundary, shaded area, critical watersheds and risk points. */
export function BasinMap({ slug, label }: BasinMapProps) {
  const facts = getBasinFacts(slug);
  const center = facts
    ? {
        longitude: (facts.bounds[0] + facts.bounds[2]) / 2,
        latitude: (facts.bounds[1] + facts.bounds[3]) / 2,
        zoom: 7,
        bearing: 0,
        pitch: 0,
      }
    : undefined;

  if (!facts || !center) {
    return (
      <p className="text-muted-foreground px-6 py-16 text-center text-sm">
        No boundary is on file for this river basin yet.
      </p>
    );
  }

  return (
    <div className="relative h-full min-h-[520px] w-full">
      <MapEngine
        initialView={center}
        initialStyleId="light"
        initialLayers={[]}
        lockBasemap
        showSearch={false}
        showLayerPanel={false}
        showLegend={false}
        showBasemapSwitcher
        basemapStyles={WEATHER_BASEMAP_STYLES}
        className="absolute inset-0 h-full w-full"
      />
      <BasinMapOverlay slug={slug} label={label} />
    </div>
  );
}

function BasinMapOverlay({ slug, label }: BasinMapProps) {
  const map = useMapStore((s) => s.map);
  const status = useMapStore((s) => s.status);
  const facts = getBasinFacts(slug);

  const [panelOpen, setPanelOpen] = useState(false);
  const [shade, setShade] = useState(0.35);
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    focus: true,
    watersheds: true,
    floodProne: true,
    incidents: true,
    others: true,
  });
  const [identified, setIdentified] = useState<Identified | null>(null);
  const [loadError, setLoadError] = useState(false);

  const dataRef = useRef<{
    basin: FeatureCollection<MultiPolygon>;
    others: FeatureCollection<MultiPolygon>;
    mask: FeatureCollection;
    sheds: FeatureCollection<MultiPolygon>;
    label: FeatureCollection<Point>;
    flood: FeatureCollection;
    incidents: FeatureCollection;
  } | null>(null);
  const [counts, setCounts] = useState({
    floodProne: null as number | null,
    incidents: 0,
    provinces: [] as [string, number][],
  });
  const [dataVersion, setDataVersion] = useState(0);

  // Load boundaries, watersheds and the points that fall inside this basin.
  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    void (async () => {
      try {
        const [all, sheds] = await Promise.all([
          loadBasinBoundaries(),
          loadCriticalWatersheds(),
        ]);
        if (cancelled) return;
        const basinFeatures = featuresForBasin(all, slug);
        const basinShape = basinFeatures.map((f) => f.geometry);

        const incidents = floodProneService
          .getGeoJson()
          .features.filter((f) => {
            if (f.geometry.type !== "Point") return false;
            const [lng, lat] = f.geometry.coordinates as [number, number];
            return basinShape.some((g) => pointInBasin(lng, lat, g));
          });

        dataRef.current = {
          basin: { type: "FeatureCollection", features: basinFeatures },
          others: {
            type: "FeatureCollection",
            features: all.features.filter((f) => f.properties?.slug !== slug),
          },
          mask: worldMask(basinFeatures),
          sheds: {
            type: "FeatureCollection",
            features: featuresForBasin(sheds, slug, "basin"),
          },
          label: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { name: `${label} River Basin` },
                geometry: {
                  type: "Point",
                  coordinates: facts
                    ? [
                        (facts.bounds[0] + facts.bounds[2]) / 2,
                        (facts.bounds[1] + facts.bounds[3]) / 2,
                      ]
                    : [0, 0],
                },
              },
            ],
          },
          flood: EMPTY,
          incidents: { type: "FeatureCollection", features: incidents },
        };
        setCounts((c) => ({ ...c, incidents: incidents.length }));
        setDataVersion((v) => v + 1);

        // Floodwatch points are fetched separately so the map never waits on them.
        const response = await fetch("/api/floodwatch/areas");
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as ApiSuccess<FeatureCollection>;
        const inside = body.data.features.filter((f) => {
          if (f.geometry.type !== "Point") return false;
          const [lng, lat] = f.geometry.coordinates as [number, number];
          return basinShape.some((g) => pointInBasin(lng, lat, g));
        });
        const byProvince = new Map<string, number>();
        for (const f of inside) {
          const province = String(f.properties?.province ?? "Unspecified");
          byProvince.set(province, (byProvince.get(province) ?? 0) + 1);
        }
        if (cancelled || !dataRef.current) return;
        dataRef.current.flood = { type: "FeatureCollection", features: inside };
        setCounts((c) => ({
          ...c,
          floodProne: inside.length,
          provinces: [...byProvince.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6),
        }));
        setDataVersion((v) => v + 1);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, label, facts]);

  /** Idempotent: (re)creates sources/layers, e.g. after a basemap switch. */
  const sync = useCallback(() => {
    const data = dataRef.current;
    if (!map || !data || !map.isStyleLoaded()) return;

    const setSource = (id: string, geojson: FeatureCollection) => {
      const existing = map.getSource(id);
      if (existing) (existing as GeoJSONSource).setData(geojson);
      else map.addSource(id, { type: "geojson", data: geojson });
    };
    setSource("rb-others", data.others);
    setSource("rb-mask", data.mask);
    setSource("rb-basin", data.basin);
    setSource("rb-sheds", data.sheds);
    setSource("rb-label", data.label);
    setSource("rb-flood", data.flood);
    setSource("rb-incidents", data.incidents);

    const add = (layer: Parameters<MapLibreMap["addLayer"]>[0]) => {
      if (!map.getLayer(layer.id)) map.addLayer(layer);
    };
    add({
      id: "rb-others-fill",
      type: "fill",
      source: "rb-others",
      paint: { "fill-color": "#64748b", "fill-opacity": 0.12 },
    });
    add({
      id: "rb-others-line",
      type: "line",
      source: "rb-others",
      paint: {
        "line-color": "#64748b",
        "line-width": 1,
        "line-opacity": 0.6,
        "line-dasharray": [2, 2],
      },
    });
    add({
      id: "rb-mask-fill",
      type: "fill",
      source: "rb-mask",
      paint: { "fill-color": "#0f172a", "fill-opacity": 0.35 },
    });
    add({
      id: "rb-basin-fill",
      type: "fill",
      source: "rb-basin",
      paint: { "fill-color": BASIN_COLOR, "fill-opacity": 0.28 },
    });
    add({
      id: "rb-basin-glow",
      type: "line",
      source: "rb-basin",
      paint: {
        "line-color": BASIN_COLOR,
        "line-width": 8,
        "line-opacity": 0.2,
        "line-blur": 4,
      },
    });
    add({
      id: "rb-basin-line",
      type: "line",
      source: "rb-basin",
      paint: { "line-color": "#0369a1", "line-width": 2.5 },
    });
    add({
      id: "rb-sheds-fill",
      type: "fill",
      source: "rb-sheds",
      paint: { "fill-color": SHED_COLOR, "fill-opacity": 0.3 },
    });
    add({
      id: "rb-sheds-line",
      type: "line",
      source: "rb-sheds",
      paint: { "line-color": "#b45309", "line-width": 1.5 },
    });
    add({
      id: "rb-flood-points",
      type: "circle",
      source: "rb-flood",
      paint: {
        "circle-color": AREA_COLOR,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6,
          2.5,
          10,
          4.5,
          14,
          8,
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1,
        "circle-opacity": 0.9,
      },
    });
    add({
      id: "rb-incident-points",
      type: "circle",
      source: "rb-incidents",
      paint: {
        "circle-color": INCIDENT_COLOR,
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6,
          3,
          10,
          5.5,
          14,
          9,
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 1.5,
      },
    });
    add({
      id: "rb-label",
      type: "symbol",
      source: "rb-label",
      maxzoom: 9,
      layout: {
        "text-field": ["get", "name"],
        "text-font": [...MAP_LABEL_FONT],
        "text-size": 14,
        "text-allow-overlap": true,
      },
      paint: {
        "text-color": "#0c4a6e",
        "text-halo-color": "rgba(255,255,255,0.95)",
        "text-halo-width": 2,
      },
    });

    const vis = (on: boolean) => (on ? "visible" : "none");
    const set = (ids: string[], on: boolean) => {
      for (const id of ids) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis(on));
      }
    };
    set(["rb-mask-fill"], visible.focus);
    set(["rb-sheds-fill", "rb-sheds-line"], visible.watersheds);
    set(["rb-flood-points"], visible.floodProne);
    set(["rb-incident-points"], visible.incidents);
    set(["rb-others-fill", "rb-others-line"], visible.others);
    map.setPaintProperty("rb-basin-fill", "fill-opacity", shade);
    map.setPaintProperty(
      "rb-mask-fill",
      "fill-opacity",
      Math.min(shade + 0.05, 0.6),
    );
  }, [map, visible, shade]);

  // Keep the layers in sync with data, toggles, and basemap changes.
  useEffect(() => {
    if (!map || status !== "ready") return;
    sync();
    const onStyle = () => sync();
    map.on("style.load", onStyle);
    return () => {
      map.off("style.load", onStyle);
    };
  }, [map, status, sync, dataVersion]);

  const fit = useCallback(() => {
    if (!map || !facts) return;
    const [w, s, e, n] = facts.bounds;
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: { top: 60, bottom: 60, left: 40, right: 40 }, duration: 800 },
    );
  }, [map, facts]);

  // Frame the basin when the map first becomes ready.
  useEffect(() => {
    if (!map || status !== "ready" || !facts) return;
    const [w, s, e, n] = facts.bounds;
    map.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: { top: 60, bottom: 60, left: 40, right: 40 }, duration: 0 },
    );
  }, [map, status, facts]);

  // Identify: click a watershed or point to inspect it.
  useEffect(() => {
    if (!map || status !== "ready") return;
    const layers = ["rb-incident-points", "rb-flood-points", "rb-sheds-fill"];
    const onClick = (event: MapMouseEvent) => {
      const present = layers.filter((id) => map.getLayer(id));
      const hit = map.queryRenderedFeatures(event.point, {
        layers: present,
      })[0];
      if (!hit) {
        setIdentified(null);
        return;
      }
      const p = hit.properties ?? {};
      if (hit.layer.id === "rb-sheds-fill") {
        setIdentified({
          kind: "watershed",
          name: String(p.name ?? "Critical watershed"),
          region: String(p.region ?? ""),
          hectares: Number(p.hectares ?? 0),
        });
      } else if (hit.layer.id === "rb-flood-points") {
        setIdentified({
          kind: "flood-prone",
          title: String(p.title ?? "Flood-prone area"),
          description: String(p.description ?? ""),
          status: String(p.status ?? ""),
        });
      } else {
        setIdentified({
          kind: "incident",
          title: String(p.title ?? "Active incident"),
          description: String(p.description ?? ""),
        });
      }
      setPanelOpen(true);
    };
    const onMove = (event: MapMouseEvent) => {
      const present = layers.filter((id) => map.getLayer(id));
      const over =
        map.queryRenderedFeatures(event.point, { layers: present }).length > 0;
      map.getCanvas().style.cursor = over ? "pointer" : "";
    };
    map.on("click", onClick);
    map.on("mousemove", onMove);
    return () => {
      map.off("click", onClick);
      map.off("mousemove", onMove);
    };
  }, [map, status]);

  const toggles: {
    key: LayerKey;
    label: string;
    color: string;
    count?: string;
  }[] = useMemo(
    () => [
      { key: "focus", label: "Dim outside basin", color: "#0f172a" },
      {
        key: "watersheds",
        label: "Critical watersheds",
        color: SHED_COLOR,
        count: String(facts?.criticalWatersheds.length ?? 0),
      },
      {
        key: "floodProne",
        label: "Flood-prone areas",
        color: AREA_COLOR,
        count:
          counts.floodProne === null ? "…" : counts.floodProne.toLocaleString(),
      },
      {
        key: "incidents",
        label: "Active incidents (NCR)",
        color: INCIDENT_COLOR,
        count: String(counts.incidents),
      },
      { key: "others", label: "Other major basins", color: "#64748b" },
    ],
    [facts, counts],
  );

  if (!facts) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        aria-expanded={panelOpen}
        className="glass border-border/60 text-foreground shadow-panel hover:bg-muted/60 pointer-events-auto absolute top-12 left-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium"
      >
        {panelOpen ? (
          <PanelLeftClose className="size-4" aria-hidden />
        ) : (
          <PanelLeftOpen className="size-4" aria-hidden />
        )}
        Layers &amp; info
      </button>

      <div className="glass border-border/60 shadow-panel pointer-events-auto absolute top-3 right-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border px-2.5 py-1.5">
        <span
          className="size-2.5 rounded-sm"
          style={{ backgroundColor: BASIN_COLOR }}
          aria-hidden
        />
        <span className="text-foreground text-xs font-semibold">
          {label} River Basin
        </span>
        <span className="text-muted-foreground hidden font-mono text-[11px] sm:inline">
          {facts.areaKm2.toLocaleString()} km²
        </span>
      </div>

      {panelOpen ? (
        <aside
          aria-label="Layers and basin information"
          className="glass divide-border/60 border-border/60 shadow-panel !bg-background/95 pointer-events-auto absolute bottom-3 left-3 flex max-h-[58%] w-[min(20rem,calc(100%-1.5rem))] flex-col divide-y overflow-hidden rounded-xl border sm:top-12 sm:bottom-3 sm:left-32 sm:max-h-none"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
            <h2 className="text-foreground text-xs font-semibold">
              Layers &amp; info
            </h2>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label="Close layers and info"
              className="text-muted-foreground hover:bg-muted/60 hover:text-foreground -mr-1 rounded-md p-1 transition-colors"
            >
              <X className="size-4" aria-hidden />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <section className="space-y-2 p-3">
              <h3 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                <Waves className="text-primary size-3.5" aria-hidden />
                Basin facts
              </h3>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                <Fact
                  label="Area"
                  value={`${facts.areaKm2.toLocaleString()} km²`}
                />
                <Fact
                  label="Critical watersheds"
                  value={String(facts.criticalWatersheds.length)}
                />
                <Fact
                  label="Flood-prone areas"
                  value={
                    counts.floodProne === null
                      ? "…"
                      : counts.floodProne.toLocaleString()
                  }
                />
                <Fact label="NCR incidents" value={String(counts.incidents)} />
                {facts.regions.length > 0 ? (
                  <Fact label="Regions" value={facts.regions.join(", ")} wide />
                ) : null}
                {facts.municipalities ? (
                  <Fact
                    label="Municipalities"
                    value={String(facts.municipalities)}
                  />
                ) : null}
                {facts.barangays ? (
                  <Fact label="Barangays" value={String(facts.barangays)} />
                ) : null}
              </dl>
            </section>

            <section className="space-y-2 p-3">
              <h3 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                <Layers className="text-primary size-3.5" aria-hidden />
                Layers
              </h3>
              <ul className="space-y-1">
                {toggles.map((t) => (
                  <li key={t.key}>
                    <label className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs">
                      <input
                        type="checkbox"
                        checked={visible[t.key]}
                        onChange={() =>
                          setVisible((v) => ({ ...v, [t.key]: !v[t.key] }))
                        }
                        className="accent-primary size-3.5"
                      />
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: t.color }}
                        aria-hidden
                      />
                      <span className="text-foreground min-w-0 flex-1 truncate">
                        {t.label}
                      </span>
                      {t.count ? (
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {t.count}
                        </span>
                      ) : null}
                    </label>
                  </li>
                ))}
              </ul>
              <label className="text-muted-foreground block px-1.5 pt-1 text-[11px]">
                Basin shading
                <input
                  type="range"
                  min={0.05}
                  max={0.7}
                  step={0.05}
                  value={shade}
                  onChange={(e) => setShade(Number(e.target.value))}
                  className="accent-primary mt-1 h-1 w-full"
                  aria-label="Basin shading opacity"
                />
              </label>
            </section>

            {identified ? (
              <section className="space-y-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-foreground text-xs font-semibold">
                    Selected feature
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIdentified(null)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Clear selection"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </div>
                {identified.kind === "watershed" ? (
                  <>
                    <p className="text-foreground text-xs font-medium">
                      {identified.name}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Critical watershed · {identified.region} ·{" "}
                      {identified.hectares.toLocaleString()} ha
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-foreground text-xs font-medium">
                      {identified.title}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {identified.kind === "flood-prone"
                        ? "Flood-prone area"
                        : "Active incident"}
                      {identified.description
                        ? ` · ${identified.description}`
                        : ""}
                    </p>
                  </>
                )}
              </section>
            ) : null}

            {counts.provinces.length > 0 ? (
              <section className="space-y-1.5 p-3">
                <h3 className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                  <Droplets
                    className="size-3.5"
                    style={{ color: AREA_COLOR }}
                    aria-hidden
                  />
                  Flood-prone areas by province
                </h3>
                <ul className="space-y-1 text-[11px]">
                  {counts.provinces.map(([province, count]) => (
                    <li key={province} className="flex justify-between gap-2">
                      <span className="text-foreground truncate">
                        {province}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {facts.criticalWatersheds.length > 0 ? (
              <section className="space-y-1.5 p-3">
                <h3 className="text-foreground text-xs font-semibold">
                  Critical watersheds
                </h3>
                <ul className="space-y-1 text-[11px]">
                  {facts.criticalWatersheds.map((w) => (
                    <li key={w.name} className="flex justify-between gap-2">
                      <span className="text-foreground truncate">{w.name}</span>
                      <span className="text-muted-foreground shrink-0 font-mono">
                        {w.hectares.toLocaleString()} ha
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
          <footer className="text-muted-foreground space-y-1 p-3 text-[10px] leading-snug">
            <p>
              Boundaries: Major River Basins and Critical Watersheds in the
              Philippines (simplified). Points: Floodwatch and NCR Critical
              Areas that fall inside the basin.
            </p>
            {loadError ? (
              <p className="text-danger">Some map data failed to load.</p>
            ) : null}
          </footer>
        </aside>
      ) : null}

      <button
        type="button"
        onClick={fit}
        className={cn(
          "glass border-border/60 text-foreground shadow-panel hover:bg-muted/60 pointer-events-auto absolute top-14 right-3 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
        )}
      >
        <Crosshair className="size-4" aria-hidden />
        <span className="hidden sm:inline">Fit basin</span>
      </button>
    </div>
  );
}

function Fact({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-medium">{value}</dd>
    </div>
  );
}
