import {
  ALL,
  type RoadFeature,
  type RoadFilters,
} from "@/features/road-network/types";

const unique = (values: string[]) =>
  [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

export interface FilterOptions {
  islands: string[];
  regions: string[];
  provinces: string[];
  deos: string[];
}

/** Cascading dropdown options: each list narrows by the choices above it. */
export function getFilterOptions(
  roads: RoadFeature[],
  filters: RoadFilters,
): FilterOptions {
  const byIsland = roads.filter(
    (r) => filters.island === ALL || r.properties.island === filters.island,
  );
  const byRegion = byIsland.filter(
    (r) => filters.region === ALL || r.properties.region === filters.region,
  );
  const byProvince = byRegion.filter(
    (r) =>
      filters.province === ALL || r.properties.province === filters.province,
  );
  return {
    islands: unique(roads.map((r) => r.properties.island)),
    regions: unique(byIsland.map((r) => r.properties.region)),
    provinces: unique(byRegion.map((r) => r.properties.province)),
    deos: unique(byProvince.map((r) => r.properties.deo)),
  };
}

export function isFiltering(filters: RoadFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.island !== ALL ||
    filters.region !== ALL ||
    filters.province !== ALL ||
    filters.deo !== ALL ||
    !filters.classes.P ||
    !filters.classes.S ||
    !filters.classes.T
  );
}

export function filterRoads(
  roads: RoadFeature[],
  filters: RoadFilters,
): RoadFeature[] {
  const q = filters.query.trim().toLowerCase();
  return roads.filter((r) => {
    const p = r.properties;
    if (!filters.classes[p.cls]) return false;
    if (filters.island !== ALL && p.island !== filters.island) return false;
    if (filters.region !== ALL && p.region !== filters.region) return false;
    if (filters.province !== ALL && p.province !== filters.province)
      return false;
    if (filters.deo !== ALL && p.deo !== filters.deo) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.roadId.toLowerCase().includes(q) ||
      p.section.toLowerCase().includes(q) ||
      p.province.toLowerCase().includes(q) ||
      p.deo.toLowerCase().includes(q) ||
      (p.route !== "" &&
        (p.route === q || `route ${p.route}` === q || `n${p.route}` === q))
    );
  });
}

export interface Breakdown {
  label: string;
  km: number;
  count: number;
}

export interface RoadStats {
  sections: number;
  km: number;
  byClass: Record<"P" | "S" | "T", { km: number; count: number }>;
  topRegions: Breakdown[];
  topProvinces: Breakdown[];
  topDeos: Breakdown[];
}

function rank(
  roads: RoadFeature[],
  key: "region" | "province" | "deo",
  limit: number,
): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const r of roads) {
    const label = r.properties[key] || "Unspecified";
    const row = map.get(label) ?? { label, km: 0, count: 0 };
    row.km += r.properties.len / 1000;
    row.count += 1;
    map.set(label, row);
  }
  return [...map.values()].sort((a, b) => b.km - a.km).slice(0, limit);
}

export function computeStats(roads: RoadFeature[]): RoadStats {
  const byClass = {
    P: { km: 0, count: 0 },
    S: { km: 0, count: 0 },
    T: { km: 0, count: 0 },
  };
  let km = 0;
  for (const r of roads) {
    const length = r.properties.len / 1000;
    km += length;
    byClass[r.properties.cls].km += length;
    byClass[r.properties.cls].count += 1;
  }
  return {
    sections: roads.length,
    km,
    byClass,
    topRegions: rank(roads, "region", 8),
    topProvinces: rank(roads, "province", 8),
    topDeos: rank(roads, "deo", 8),
  };
}

const csvCell = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`;

/** CSV of the road sections currently shown. */
export function roadsToCsv(roads: RoadFeature[]): string {
  const header = [
    "Road ID",
    "Section ID",
    "Road name",
    "Class",
    "Route no.",
    "Island",
    "Region",
    "Province",
    "District Engineering Office",
    "Length (km)",
    "Congressional district",
    "Remarks",
  ];
  const names = { P: "Primary", S: "Secondary", T: "Tertiary" } as const;
  const rows = roads.map(({ properties: p }) =>
    [
      p.roadId,
      p.section,
      p.name,
      names[p.cls],
      p.route,
      p.island,
      p.region,
      p.province,
      p.deo,
      (p.len / 1000).toFixed(3),
      p.district,
      p.remarks,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...rows].join("\n");
}
