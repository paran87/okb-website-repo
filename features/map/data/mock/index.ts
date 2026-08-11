import type { FeatureCollection } from "geojson";
import { DEOS_FLOOD_PRONE_AREAS } from "@/features/flood-prone/data";

/** Mock flood incident points across Metro Manila. */
export const MOCK_INCIDENTS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "inc-001",
        title: "EDSA-Kamuning Flooding",
        status: "Active",
        priority: "critical",
        tone: "critical",
        category: "incidents",
      },
      geometry: { type: "Point", coordinates: [121.0435, 14.6342] },
    },
    {
      type: "Feature",
      properties: {
        id: "inc-002",
        title: "Marikina River Overflow",
        status: "Monitoring",
        priority: "critical",
        tone: "flood",
        category: "incidents",
      },
      geometry: { type: "Point", coordinates: [121.0821, 14.6503] },
    },
    {
      type: "Feature",
      properties: {
        id: "inc-003",
        title: "C-5 Bicutan Flooding",
        status: "Active",
        priority: "high",
        tone: "flood",
        category: "incidents",
      },
      geometry: { type: "Point", coordinates: [121.0412, 14.4876] },
    },
    {
      type: "Feature",
      properties: {
        id: "inc-004",
        title: "Roxas Blvd. Drainage",
        status: "Response",
        priority: "high",
        tone: "warning",
        category: "incidents",
      },
      geometry: { type: "Point", coordinates: [120.9821, 14.5782] },
    },
    {
      type: "Feature",
      properties: {
        id: "inc-005",
        title: "San Mateo Creek Alert",
        status: "Watch",
        priority: "medium",
        tone: "warning",
        category: "incidents",
      },
      geometry: { type: "Point", coordinates: [121.1234, 14.6951] },
    },
    {
      type: "Feature",
      properties: {
        id: "inc-006",
        title: "Tullahan River Rise",
        status: "Active",
        priority: "high",
        tone: "flood",
        category: "incidents",
      },
      geometry: { type: "Point", coordinates: [121.0012, 14.7123] },
    },
  ],
};

/** Mock critical area polygons. */
export const MOCK_CRITICAL_AREAS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "ca-001",
        title: "Marikina River Basin",
        status: "Level 3",
        priority: "critical",
        category: "critical-areas",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [121.07, 14.64],
            [121.1, 14.64],
            [121.1, 14.67],
            [121.07, 14.67],
            [121.07, 14.64],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "ca-002",
        title: "Tullahan Flood Plain",
        status: "Level 2",
        priority: "high",
        category: "critical-areas",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [120.99, 14.7],
            [121.02, 14.7],
            [121.02, 14.73],
            [120.99, 14.73],
            [120.99, 14.7],
          ],
        ],
      },
    },
  ],
};

/** Mock flood-prone zone polygons. */
export const MOCK_FLOOD_ZONES: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "fz-001",
        title: "Quezon City Low-Lying Zone",
        category: "flood-prone",
        riskLevel: "flood-prone",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [121.02, 14.62],
            [121.06, 14.62],
            [121.06, 14.65],
            [121.02, 14.65],
            [121.02, 14.62],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "fz-002",
        title: "Manila Bay Coastal Strip",
        category: "flood-prone",
        riskLevel: "normal",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [120.96, 14.56],
            [121.0, 14.56],
            [121.0, 14.59],
            [120.96, 14.59],
            [120.96, 14.56],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "fz-003",
        title: "Pasig River Adjacent Zone",
        category: "flood-prone",
        riskLevel: "flood-prone",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [121.06, 14.57],
            [121.09, 14.57],
            [121.09, 14.6],
            [121.06, 14.6],
            [121.06, 14.57],
          ],
        ],
      },
    },
  ],
};

/** Mock road network linestrings. */
export const MOCK_ROADS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "rd-001",
        title: "EDSA Corridor",
        status: "Partial Closure",
        closed: true,
        category: "roads",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [121.038, 14.632],
          [121.045, 14.636],
          [121.052, 14.639],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "rd-002",
        title: "C-5 Southbound",
        status: "Closed",
        closed: true,
        category: "roads",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [121.035, 14.49],
          [121.042, 14.485],
          [121.048, 14.48],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "rd-003",
        title: "Roxas Boulevard",
        status: "Open",
        closed: false,
        category: "roads",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [120.975, 14.575],
          [120.985, 14.578],
          [120.995, 14.581],
        ],
      },
    },
  ],
};

/** Mock water-level sensor points. */
export const MOCK_SENSORS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "sns-001",
        title: "Marikina River Sensor",
        status: "Online",
        level: "3.2m",
        category: "sensors",
      },
      geometry: { type: "Point", coordinates: [121.085, 14.652] },
    },
    {
      type: "Feature",
      properties: {
        id: "sns-002",
        title: "Pasig River Sensor",
        status: "Online",
        level: "2.1m",
        category: "sensors",
      },
      geometry: { type: "Point", coordinates: [121.072, 14.585] },
    },
    {
      type: "Feature",
      properties: {
        id: "sns-003",
        title: "Tullahan Sensor",
        status: "Warning",
        level: "4.0m",
        category: "sensors",
      },
      geometry: { type: "Point", coordinates: [121.005, 14.715] },
    },
  ],
};

/** Mock equipment GPS points (clustered at scale). */
export const MOCK_EQUIPMENT: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "eq-001",
        title: "Amphibious Excavator A1",
        status: "Deployed",
        category: "equipment",
      },
      geometry: { type: "Point", coordinates: [121.083, 14.651] },
    },
    {
      type: "Feature",
      properties: {
        id: "eq-002",
        title: "Mobile Pump Unit P3",
        status: "Deployed",
        category: "equipment",
      },
      geometry: { type: "Point", coordinates: [121.044, 14.635] },
    },
    {
      type: "Feature",
      properties: {
        id: "eq-003",
        title: "Dump Truck Convoy",
        status: "En Route",
        category: "equipment",
      },
      geometry: { type: "Point", coordinates: [121.04, 14.488] },
    },
    {
      type: "Feature",
      properties: {
        id: "eq-004",
        title: "Generator Set G7",
        status: "Standby",
        category: "equipment",
      },
      geometry: { type: "Point", coordinates: [121.025, 14.62] },
    },
  ],
};

export const MOCK_GEOJSON_REGISTRY = {
  incidents: MOCK_INCIDENTS,
  "critical-areas": MOCK_CRITICAL_AREAS,
  "flood-zones": MOCK_FLOOD_ZONES,
  "deos-flood-prone-areas": DEOS_FLOOD_PRONE_AREAS,
  roads: MOCK_ROADS,
  sensors: MOCK_SENSORS,
  equipment: MOCK_EQUIPMENT,
} as const;

export type MockGeoJsonRegistryKey = keyof typeof MOCK_GEOJSON_REGISTRY;
