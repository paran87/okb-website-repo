"use client";

import { useCallback, useState } from "react";
import { MapPin, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { MapEngine } from "@/features/map/components/map-engine";
import { PUBLIC_BASEMAP_STYLES } from "@/features/map/config/map-styles";
import {
  NCR_MAP_VIEW,
  PHILIPPINES_MAX_BOUNDS,
} from "@/features/map/config/default-view";
import { createFloodProneLayerRegistry } from "@/features/flood-prone/config/layer-registry";
import { FloodProneAreaList } from "@/features/flood-prone/components/flood-prone-area-list";
import {
  FloodProneMapFit,
  getFloodProneMarkerCount,
} from "@/features/flood-prone/components/flood-prone-map-fit";
import { useFloodProneAreas } from "@/features/flood-prone/hooks/use-flood-prone-areas";
import { useMapStore } from "@/features/map/store/map.store";
import { mapService } from "@/features/map/services/map.service";
import { popupService } from "@/features/map/services/popup.service";
import type { DeosFloodProneArea } from "@/features/flood-prone/types";
import { floodProneService } from "@/features/flood-prone/services/flood-prone.service";
import { IconButton } from "@/components/ui/icon-button";

const FLOOD_PRONE_LAYERS = createFloodProneLayerRegistry();
const MARKER_COUNT = getFloodProneMarkerCount();

/** Philippine map with every DEOS 2026 flood-prone road section marked. */
export function FloodProneMap() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const {
    deoGroups,
    filteredAreas,
    selectedId,
    setSelectedId,
    search,
    setSearch,
    deoFilter,
    setDeoFilter,
  } = useFloodProneAreas();

  const handleSelect = useCallback((area: DeosFloodProneArea) => {
    setSelectedId(area.id);

    const map = useMapStore.getState().map;
    if (!map) return;

    const feature = floodProneService
      .getGeoJson()
      .features.find((f) => f.properties?.id === area.id);

    if (!feature || feature.geometry.type !== "Point") return;

    const [lng, lat] = feature.geometry.coordinates as [number, number];
    mapService.flyTo(map, { longitude: lng, latitude: lat, zoom: 16 });

    useMapStore.getState().setPopup(
      popupService.createState(feature, [lng, lat], {
        x: map.getContainer().clientWidth / 2,
        y: map.getContainer().clientHeight / 2,
      }),
    );
  }, [setSelectedId]);

  const zoomToNcr = useCallback(() => {
    const map = useMapStore.getState().map;
    if (!map) return;
    mapService.fitToFeatureCollection(map, floodProneService.getGeoJson(), {
      padding: 72,
      maxZoom: 12,
      duration: 1200,
    });
  }, []);

  const showAllMarkers = useCallback(() => {
    zoomToNcr();
  }, [zoomToNcr]);

  return (
    <div className="flex h-full min-h-0 w-full">
      {sidebarOpen ? (
        <FloodProneAreaList
          className="w-full max-w-md shrink-0"
          areas={filteredAreas}
          deoOptions={deoGroups.map((g) => g.deo)}
          selectedId={selectedId}
          search={search}
          deoFilter={deoFilter}
          onSearchChange={setSearch}
          onDeoFilterChange={setDeoFilter}
          onSelect={handleSelect}
        />
      ) : null}

      <div className="relative min-h-0 min-w-0 flex-1">
        <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-2">
          <IconButton
            icon={sidebarOpen ? PanelLeftClose : PanelLeftOpen}
            label={sidebarOpen ? "Hide area list" : "Show area list"}
            variant="outline"
            size="sm"
            className="glass shadow-panel"
            onClick={() => setSidebarOpen((open) => !open)}
          />
          <button
            type="button"
            onClick={showAllMarkers}
            className="glass rounded-md px-3 py-1.5 text-xs font-medium shadow-panel transition-colors hover:bg-muted/60"
          >
            Show all markers
          </button>
          <div className="glass flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-red-700 shadow-panel dark:text-red-300">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            {MARKER_COUNT} areas marked
          </div>
        </div>

        <MapEngine
          initialView={{ ...NCR_MAP_VIEW, zoom: 11 }}
          initialStyleId="light"
          initialLayers={FLOOD_PRONE_LAYERS}
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
      </div>
    </div>
  );
}
