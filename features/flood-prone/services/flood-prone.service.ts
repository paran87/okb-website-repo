import type { FeatureCollection } from "geojson";
import type {
  DeosFloodProneArea,
  NcrCriticalAreaRecord,
} from "@/features/flood-prone/types";
import { parseArea } from "@/features/flood-prone/lib/parse-area";
import { DEOS_FLOOD_PRONE_AREAS } from "@/features/flood-prone/data";
import rawAreas from "@/features/flood-prone/data/deos-flood-prone-raw.json";

/** Static flood-prone area catalog from DEOS 2026 document. */
export const floodProneService = {
  getAreas(): DeosFloodProneArea[] {
    return rawAreas as DeosFloodProneArea[];
  },

  getGeoJson(): FeatureCollection {
    return DEOS_FLOOD_PRONE_AREAS;
  },

  /** Table records joined with marker coordinates and geocode status. */
  getRecords(): NcrCriticalAreaRecord[] {
    const features = new Map(
      DEOS_FLOOD_PRONE_AREAS.features.map((f) => [f.properties?.id, f]),
    );
    return this.getAreas().map((area) => {
      const feature = features.get(area.id);
      const coords =
        feature?.geometry.type === "Point"
          ? (feature.geometry.coordinates as [number, number])
          : null;
      return {
        id: area.id,
        index: area.index,
        deo: area.deo,
        region: "NCR",
        province: "NCR",
        ...parseArea(area),
        description: area.description,
        longitude: coords?.[0] ?? null,
        latitude: coords?.[1] ?? null,
        status:
          feature?.properties?.geocodeMethod === "road-lookup"
            ? "located"
            : "review",
      };
    });
  },

  getDeoGroups(): { deo: string; areas: DeosFloodProneArea[] }[] {
    const map = new Map<string, DeosFloodProneArea[]>();
    for (const area of this.getAreas()) {
      const list = map.get(area.deo) ?? [];
      list.push(area);
      map.set(area.deo, list);
    }
    return [...map.entries()].map(([deo, areas]) => ({ deo, areas }));
  },

  findById(id: string): DeosFloodProneArea | undefined {
    return this.getAreas().find((area) => area.id === id);
  },
};
