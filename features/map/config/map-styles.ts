import type { StyleSpecification } from "maplibre-gl";
import type { MapStyleDefinition } from "@/features/map/types";

const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION} © CARTO`;
const ESRI_IMAGERY_ATTRIBUTION =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, AeroGRID, IGN, IGP, and the GIS User Community";
const OPENTOPO_ATTRIBUTION = `${OSM_ATTRIBUTION}, SRTM | Map style: © OpenTopoMap (CC-BY-SA)`;

const MAPLIBRE_GLYPHS =
  "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";

function rasterBasemap(
  id: string,
  tiles: string[],
  attribution: string,
  maxzoom = 22,
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

/** Google Maps–style street map (colorful labels, roads, POIs). */
const STREETS_STYLE = rasterBasemap(
  "carto-voyager",
  ["https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"],
  CARTO_ATTRIBUTION,
);

/** Satellite imagery with street labels overlay (hybrid view). */
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
    "carto-labels": {
      type: "raster",
      tiles: [
        "https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: CARTO_ATTRIBUTION,
      maxzoom: 22,
    },
  },
  [
    { id: "esri-imagery-layer", type: "raster", source: "esri-imagery" },
    { id: "carto-labels-layer", type: "raster", source: "carto-labels" },
  ],
);

/** Topographic terrain map with elevation shading. */
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
    style: rasterBasemap(
      "carto-dark",
      ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"],
      CARTO_ATTRIBUTION,
    ),
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

export function getMapStyle(id: MapStyleDefinition["id"]): StyleSpecification {
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

export type PublicBasemapStyleId = (typeof PUBLIC_BASEMAP_STYLES)[number];

export function getBasemapLabel(id: MapStyleDefinition["id"]): string {
  return MAP_STYLE_DEFINITIONS.find((s) => s.id === id)?.label ?? "Map";
}
