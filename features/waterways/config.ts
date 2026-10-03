/** Shared (client + server) definitions for the Waterways module. */

export type UrbCode = "01" | "02" | "03" | "04";
export type DischargeClassId = "dry" | "low" | "moderate" | "high";
export type OverlayId =
  "flood" | "landslide" | "watershed" | "basin" | "springs" | "sampling";

export type LngLatBounds = [number, number, number, number];

/** Upper river basins covered by the DENR INREMP river system layer. */
export const URBS: {
  code: UrbCode;
  name: string;
  places: string;
  bounds: LngLatBounds;
}[] = [
  {
    code: "01",
    name: "Chico Upper River Basin",
    places: "Kalinga, Mt. Province, Apayao (CAR)",
    bounds: [120.85, 16.85, 121.53, 17.92],
  },
  {
    code: "02",
    name: "Wahig-Inabanga River Basin",
    places: "Bohol (Region VII)",
    bounds: [124.06, 9.74, 124.38, 10.08],
  },
  {
    code: "03",
    name: "Bukidnon Upper River Basin",
    places: "Bukidnon, Misamis Oriental (Region X)",
    bounds: [124.53, 7.41, 125.27, 8.64],
  },
  {
    code: "04",
    name: "Lake Lanao River Basin",
    places: "Lanao del Norte (BARMM)",
    bounds: [124.06, 7.64, 124.6, 8.08],
  },
];

/** Discharge classes: server-side filter expression + how the river is drawn. */
export const DISCHARGE_CLASSES: {
  id: DischargeClassId;
  label: string;
  hint: string;
  color: [number, number, number];
  hex: string;
  width: number;
  where: string;
}[] = [
  {
    id: "dry",
    label: "Dry / no data",
    hint: "0 or not measured",
    color: [148, 163, 184],
    hex: "#94a3b8",
    width: 1.1,
    where: "(discharge_rate = 0 OR discharge_rate IS NULL)",
  },
  {
    id: "low",
    label: "Low flow",
    hint: "up to 5",
    color: [56, 189, 248],
    hex: "#38bdf8",
    width: 1.6,
    where: "(discharge_rate > 0 AND discharge_rate <= 5)",
  },
  {
    id: "moderate",
    label: "Moderate flow",
    hint: "5 to 50",
    color: [37, 99, 235],
    hex: "#2563eb",
    width: 2.4,
    where: "(discharge_rate > 5 AND discharge_rate <= 50)",
  },
  {
    id: "high",
    label: "High flow",
    hint: "above 50",
    color: [30, 27, 75],
    hex: "#1e1b4b",
    width: 3.6,
    where: "(discharge_rate > 50)",
  },
];

/** Reference layers published on the same DENR map service. */
export const OVERLAYS: {
  id: OverlayId;
  layer: number;
  label: string;
  hint: string;
}[] = [
  {
    id: "flood",
    layer: 49,
    label: "Flood hazard",
    hint: "Susceptibility zones",
  },
  {
    id: "landslide",
    layer: 50,
    label: "Landslide hazard",
    hint: "Susceptibility zones",
  },
  {
    id: "watershed",
    layer: 46,
    label: "Watershed boundaries",
    hint: "INREMP watersheds",
  },
  {
    id: "basin",
    layer: 45,
    label: "River basin boundaries",
    hint: "Basin outlines",
  },
  { id: "springs", layer: 16, label: "Springs", hint: "Mapped water sources" },
  {
    id: "sampling",
    layer: 15,
    label: "Water sampling points",
    hint: "Monitoring sites",
  },
];

export const ALL_URBS: UrbCode[] = URBS.map((u) => u.code);
export const ALL_CLASSES: DischargeClassId[] = DISCHARGE_CLASSES.map(
  (c) => c.id,
);

/** Overall extent of the four basins, with some margin. */
export const WATERWAYS_BOUNDS: LngLatBounds = [119.8, 6.9, 126.2, 18.4];

export interface WaterwayStats {
  totals: { segments: number; km: number };
  byUrb: {
    code: UrbCode;
    segments: number;
    km: number;
    maxDischarge: number | null;
  }[];
  byClass: { id: DischargeClassId; segments: number; km: number }[];
  rivers: {
    name: string;
    code: UrbCode;
    segments: number;
    km: number;
    maxDischarge: number | null;
  }[];
}

export interface IdentifiedSegment {
  objectId: number;
  basin: string;
  river: string | null;
  discharge: number | null;
  lengthM: number;
  geometry: GeoJSON.MultiLineString;
}

export interface RiverResult {
  name: string;
  segments: number;
  km: number;
  maxDischarge: number | null;
  basins: string[];
  bounds: LngLatBounds;
  geometry: GeoJSON.MultiLineString;
}
