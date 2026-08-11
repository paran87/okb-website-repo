import type { FeatureCollection } from "geojson";
import type { DeosFloodProneArea } from "@/features/flood-prone/types";
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
