import type { StyleSpecification } from "maplibre-gl";
import type { MapStyleDefinition } from "@/features/map/types";

const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
const ESRI_IMAGERY_ATTRIBUTION =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, AeroGRID, IGN, IGP, and the GIS User Community";
const OPENTOPO_ATTRIBUTION = `${OSM_ATTRIBUTION}, SRTM | Map style: © OpenTopoMap (CC-BY-SA)`;

/**
 * Every basemap here resolves glyphs through OpenFreeMap, which serves only the
 * Noto Sans family. Symbol layers must request `MAP_LABEL_FONT`, otherwise the
 * glyph range 404s and labels silently disappear.
 */
const MAPLIBRE_GLYPHS =
  "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

/** Bold label fontstack available on every basemap's glyph endpoint. */
export const MAP_LABEL_FONT = ["Noto Sans Bold"] as const;

function rasterBasemap(
  id: string,
  tiles: string[],
  attribution: string,
  maxzoom = 18,
): StyleSpecification {
  return {
    version: 8,
    name: id,
    glyphs: MAPLIBRE_GLYPHS,
    sources: {
      [id]: {
        type: "raster",
        tiles,
        tileSize: 256,
        attribution,
        maxzoom,
      },
    },
    layers: [
      {
        id: `${id}-layer`,
        type: "raster",
        source: id,
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  };
}

function compositeBasemap(
  id: string,
  sources: StyleSpecification["sources"],
  layers: StyleSpecification["layers"],
): StyleSpecification {
  return {
    version: 8,
    name: id,
    glyphs: MAPLIBRE_GLYPHS,
    sources,
    layers,
  };
}

/**
 * OpenFreeMap vector styles — sharp labels at every zoom, no raster
 * "zoom not supported" tiles. Free, no API key.
 */
const STREETS_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

/**
 * Esri World Imagery + official Esri road/place overlays.
 * Source maxzoom matches what Esri actually serves so MapLibre overzooms
 * existing tiles instead of fetching placeholder "zoom not supported" images.
 */
const SATELLITE_STYLE = compositeBasemap(
  "satellite-hybrid",
  {
    "esri-imagery": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: ESRI_IMAGERY_ATTRIBUTION,
      maxzoom: 19,
    },
    "esri-roads": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: ESRI_IMAGERY_ATTRIBUTION,
      maxzoom: 19,
    },
    "esri-places": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: ESRI_IMAGERY_ATTRIBUTION,
      maxzoom: 19,
    },
  },
  [
    { id: "esri-imagery-layer", type: "raster", source: "esri-imagery" },
    { id: "esri-roads-layer", type: "raster", source: "esri-roads" },
    { id: "esri-places-layer", type: "raster", source: "esri-places" },
  ],
);

/** Topographic terrain — OpenTopoMap tiles exist only through zoom 17. */
const TERRAIN_STYLE = rasterBasemap(
  "opentopomap",
  ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
  OPENTOPO_ATTRIBUTION,
  17,
);

/** Basemap styles — streets/satellite/terrain for operational GIS views. */
export const MAP_STYLE_DEFINITIONS: readonly MapStyleDefinition[] = [
  {
    id: "light",
    label: "Map",
    style: STREETS_STYLE,
  },
  {
    id: "dark",
    label: "Dark",
    style: DARK_STYLE,
  },
  {
    id: "satellite",
    label: "Satellite",
    style: SATELLITE_STYLE,
  },
  {
    id: "terrain",
    label: "Terrain",
    style: TERRAIN_STYLE,
  },
];

export function getMapStyle(
  id: MapStyleDefinition["id"],
): StyleSpecification | string {
  const found = MAP_STYLE_DEFINITIONS.find((s) => s.id === id);
  return found?.style ?? MAP_STYLE_DEFINITIONS[0]!.style;
}

export function getDefaultStyleForTheme(
  theme: "dark" | "light" | string | undefined,
): MapStyleDefinition["id"] {
  return theme === "light" ? "light" : "dark";
}

/** Basemap options shown in the Google Maps–style layer switcher. */
export const PUBLIC_BASEMAP_STYLES = ["light", "satellite", "terrain"] as const;

/** Weather module — street map first so zoom stays sharp nationwide. */
export const WEATHER_BASEMAP_STYLES = ["light", "satellite", "terrain"] as const;

export type PublicBasemapStyleId = (typeof PUBLIC_BASEMAP_STYLES)[number];

export function getBasemapLabel(id: MapStyleDefinition["id"]): string {
  return MAP_STYLE_DEFINITIONS.find((s) => s.id === id)?.label ?? "Map";
}
