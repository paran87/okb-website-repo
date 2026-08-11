import type { FeatureCollection } from "geojson";
import geojson from "./deos-flood-prone.json";

/** DEOS Updated Flood Prone Areas 2026 — geocoded point markers for NCR road sections. */
export const DEOS_FLOOD_PRONE_AREAS = geojson as FeatureCollection;
