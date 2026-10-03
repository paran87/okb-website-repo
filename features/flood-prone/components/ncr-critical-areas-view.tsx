"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { Download, FileText, Search } from "lucide-react";
import { MapEngine } from "@/features/map/components/map-engine";
import { PUBLIC_BASEMAP_STYLES } from "@/features/map/config/map-styles";
import {
  NCR_MAP_VIEW,
  PHILIPPINES_MAX_BOUNDS,
} from "@/features/map/config/default-view";
import { createFloodProneLayerRegistry } from "@/features/flood-prone/config/layer-registry";
import {
  BottomSheet,
  type SheetSnap,
} from "@/features/flood-prone/components/bottom-sheet";
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
  "w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5 text-xs outline-none ring-ring focus:ring-2 lg:px-3 lg:py-2 lg:text-sm";

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
  const [sheetHeight, setSheetHeight] = useState(0);
  const [snapRequest, setSnapRequest] = useState<{ snap: SheetSnap; nonce: number }>({
    snap: "half",
    nonce: 0,
  });

  const handleSelect = useCallback(
    (record: NcrCriticalAreaRecord) => {
      setSelectedId(record.id);
      // On phones, lower the sheet so it doesn't cover the pin.
      setSnapRequest((r) => ({ snap: "half", nonce: r.nonce + 1 }));
      const map = useMapStore.getState().map;
      if (!map) return;
      setSelectedMarker(map, record.id);

      const feature = floodProneService
        .getGeoJson()
        .features.find((f) => f.properties?.id === record.id);
      if (!feature || feature.geometry.type !== "Point") return;

      const [lng, lat] = feature.geometry.coordinates as [number, number];
      // While the sheet overlays the map, centre the pin in the part still visible.
      const inset = sheetHeight;
      map.flyTo({
        center: [lng, lat],
        zoom: 16,
        padding: { top: 0, left: 0, right: 0, bottom: inset },
        duration: 1200,
        essential: true,
      });
      useMapStore.getState().setPopup(
        popupService.createState(feature, [lng, lat], {
          x: map.getContainer().clientWidth / 2,
          y: (map.getContainer().clientHeight - inset) / 2,
        }),
      );
    },
    [setSelectedId, sheetHeight],
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
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2 lg:gap-3 lg:p-4">
      <section className="grid shrink-0 grid-cols-3 gap-1.5 rounded-lg border border-border bg-surface p-2 shadow-panel lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] lg:gap-2 lg:p-3">
        <label className="relative col-span-3 block lg:col-span-1">
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

      <div className="relative min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:grid-rows-[minmax(0,1fr)] lg:gap-3">
        <section className="absolute inset-0 isolate min-w-0 overflow-hidden rounded-lg border border-border bg-surface shadow-panel lg:relative lg:order-2 lg:inset-auto">
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

        <BottomSheet
          className="lg:min-w-0"
          onHeightChange={setSheetHeight}
          snapRequest={snapRequest}
          title={
            <>
              {filtered.length.toLocaleString()} of {records.length.toLocaleString()} records
              {needsReview > 0 ? ` · ${needsReview} need review` : ""}
            </>
          }
          actions={
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
          }
        >
            <table className="w-full min-w-[480px] border-collapse text-left text-xs lg:min-w-[560px] lg:text-sm">
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
        </BottomSheet>
      </div>
    </div>
  );
}
