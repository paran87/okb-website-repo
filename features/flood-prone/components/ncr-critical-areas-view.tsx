"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Download, FileText, Search } from "lucide-react";
import { MapEngine } from "@/features/map/components/map-engine";
import { PUBLIC_BASEMAP_STYLES } from "@/features/map/config/map-styles";
import {
  NCR_MAP_VIEW,
  PHILIPPINES_MAX_BOUNDS,
} from "@/features/map/config/default-view";
import { createFloodProneLayerRegistry } from "@/features/flood-prone/config/layer-registry";
import { FloodProneMapFit } from "@/features/flood-prone/components/flood-prone-map-fit";
import { useFloodProneAreas } from "@/features/flood-prone/hooks/use-flood-prone-areas";
import {
  exportRecordsCsv,
  exportRecordsPdf,
} from "@/features/flood-prone/lib/export-records";
import { floodProneService } from "@/features/flood-prone/services/flood-prone.service";
import type { NcrCriticalAreaRecord } from "@/features/flood-prone/types";
import { useMapStore } from "@/features/map/store/map.store";
import { mapService } from "@/features/map/services/map.service";
import { popupService } from "@/features/map/services/popup.service";
import { cn } from "@/utils/cn";

const LAYERS = createFloodProneLayerRegistry();
const SELECTED_LAYER = "deos-flood-prone-areas-selected";

const selectClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2";

function setSelectedMarker(map: MapLibreMap, id: string | null) {
  if (!map.getLayer(SELECTED_LAYER)) return;
  map.setFilter(SELECTED_LAYER, ["==", ["get", "id"], id ?? ""]);
}

/** NCR critical areas: filter bar, records table, and a synced map. */
export function NcrCriticalAreasView() {
  const {
    records,
    filtered,
    regions,
    provinces,
    municipalities,
    selectedId,
    setSelectedId,
    search,
    setSearch,
    region,
    setRegion,
    province,
    setProvince,
    municipality,
    setMunicipality,
  } = useFloodProneAreas();
  const rowRefs = useRef(new Map<string, HTMLTableRowElement>());
  const filtersMounted = useRef(false);

  const handleSelect = useCallback(
    (record: NcrCriticalAreaRecord) => {
      setSelectedId(record.id);
      const map = useMapStore.getState().map;
      if (!map) return;
      setSelectedMarker(map, record.id);

      const feature = floodProneService
        .getGeoJson()
        .features.find((f) => f.properties?.id === record.id);
      if (!feature || feature.geometry.type !== "Point") return;

      const [lng, lat] = feature.geometry.coordinates as [number, number];
      mapService.flyTo(map, { longitude: lng, latitude: lat, zoom: 16 });
      useMapStore.getState().setPopup(
        popupService.createState(feature, [lng, lat], {
          x: map.getContainer().clientWidth / 2,
          y: map.getContainer().clientHeight / 2,
        }),
      );
    },
    [setSelectedId],
  );

  // Refit the map to the filtered records whenever the filters change.
  useEffect(() => {
    if (!filtersMounted.current) {
      filtersMounted.current = true;
      return;
    }
    const map = useMapStore.getState().map;
    if (!map) return;
    const ids = new Set(filtered.map((r) => r.id));
    const features = floodProneService
      .getGeoJson()
      .features.filter((f) => ids.has(f.properties?.id));
    if (features.length === 0) return;
    mapService.fitToFeatureCollection(
      map,
      { features },
      { padding: 72, maxZoom: 15, duration: 800 },
    );
  }, [filtered]);

  // Keep the highlighted row visible after a selection.
  useEffect(() => {
    if (selectedId) {
      rowRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId]);

  const needsReview = filtered.filter((r) => r.status === "review").length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 md:p-4 lg:overflow-hidden">
      <section className="grid shrink-0 gap-2 rounded-lg border border-border bg-surface p-3 shadow-panel md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search road, barangay, municipality…"
            className={cn(selectClass, "pl-9")}
          />
        </label>
        <select
          aria-label="Region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className={selectClass}
        >
          <option value="all">All regions</option>
          {regions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Province"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className={selectClass}
        >
          <option value="all">All provinces</option>
          {provinces.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          aria-label="Municipality or city"
          value={municipality}
          onChange={(e) => setMunicipality(e.target.value)}
          className={selectClass}
        >
          <option value="all">All municipalities/cities</option>
          {municipalities.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </section>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-panel lg:min-h-0">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              {filtered.length.toLocaleString()} of {records.length.toLocaleString()}{" "}
              records
              {needsReview > 0 ? ` · ${needsReview} need review` : ""}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={filtered.length === 0}
                onClick={() => exportRecordsCsv(filtered)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/60 disabled:opacity-50"
              >
                <Download className="size-3.5" aria-hidden />
                CSV
              </button>
              <button
                type="button"
                disabled={filtered.length === 0}
                onClick={() => exportRecordsPdf(filtered)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <FileText className="size-3.5" aria-hidden />
                PDF
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-primary text-primary-foreground">
                <tr className="text-[11px] uppercase tracking-wide">
                  <th className="px-3 py-2.5 font-semibold">Province</th>
                  <th className="px-3 py-2.5 font-semibold">Municipality/City</th>
                  <th className="px-3 py-2.5 font-semibold">Barangay / Location</th>
                  <th className="px-3 py-2.5 font-semibold">Road / Waterway</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-8 text-center text-muted-foreground"
                    >
                      No records match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      ref={(el) => {
                        if (el) rowRefs.current.set(r.id, el);
                        else rowRefs.current.delete(r.id);
                      }}
                      onClick={() => handleSelect(r)}
                      className={cn(
                        "cursor-pointer border-b border-border align-top transition-colors",
                        selectedId === r.id
                          ? "bg-primary/15"
                          : "odd:bg-muted/30 hover:bg-muted/60",
                      )}
                    >
                      <td className="px-3 py-2.5">{r.province}</td>
                      <td className="px-3 py-2.5">{r.municipality}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {r.location}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-primary">
                        {r.road}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="relative min-h-[360px] min-w-0 overflow-hidden rounded-lg border border-border bg-surface shadow-panel lg:min-h-0">
          <MapEngine
            initialView={{ ...NCR_MAP_VIEW, zoom: 11 }}
            initialStyleId="light"
            initialLayers={LAYERS}
            maxBounds={PHILIPPINES_MAX_BOUNDS}
            lockBasemap
            resetViewPreset="ncr"
            basemapStyles={PUBLIC_BASEMAP_STYLES}
            showBasemapSwitcher
            showSearch={false}
            showLayerPanel={false}
            showLegend
            className="absolute inset-0 h-full w-full"
          />
          <FloodProneMapFit />
        </section>
      </div>
    </div>
  );
}
