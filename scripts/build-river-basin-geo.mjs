// Builds river basin boundary + critical watershed GeoJSON and a facts table.
// Source: the public "Major River Basins and Critical Watersheds in the
// Philippines" ArcGIS web map (item 5f088260010e4714a4faaef27018b7a7).
// Run: node scripts/build-river-basin-geo.mjs
import { mkdir, writeFile } from "node:fs/promises";

const ITEM =
  "https://www.arcgis.com/sharing/rest/content/items/5f088260010e4714a4faaef27018b7a7/data?f=json";

/** Source feature name -> app slug. Marikina and Pasig-Laguna de Bay form one basin. */
const SLUG_BY_NAME = {
  "Apayao-Abulog River Basin": "apayao-abulug",
  "Cagayan River Basin": "cagayan",
  "Abra River Basin": "abra",
  "Agno River Basin": "agno",
  "Pampanga River Basin": "pampanga",
  "Marikina River Basin": "pasig-marikina",
  "Pasig-Laguna de Bay River Basin": "pasig-marikina",
  "Bicol River Basin": "bicol",
  "Panay River Basin": "panay",
  "Jalaur River Basin": "jalaur",
  "Ilog-Hilabangan River Basin": "ilog-hilabangan",
  "Agusan River Basin": "agusan",
  "Mindanao River Basin": "mindanao",
  "Ranao (Agus) River Basin": "ranao-agus",
  "Cagayan de Oro River Basin": "cagayan-de-oro",
  "Buayan-Malungon River Basin": "buayan-malungon",
  "Davao River Basin": "davao",
  "Tagoloan River Basin": "tagoloan",
  "Tagum-Libuganon River Basin": "tagum-libuganon",
};

const R = 6378137;
const toLngLat = ([x, y]) => [
  (x / R) * (180 / Math.PI),
  (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI),
];
const round = (n) => Math.round(n * 1e4) / 1e4;

function perpendicular(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  let max = 0;
  let index = 0;
  const last = points.length - 1;
  for (let i = 1; i < last; i += 1) {
    const d = perpendicular(points[i], points[0], points[last]);
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= tolerance) return [points[0], points[last]];
  return [
    ...simplify(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplify(points.slice(index), tolerance),
  ];
}

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return sum / 2;
}

/** Esri rings -> GeoJSON polygon coordinates (WGS84, simplified). */
function convert(rings, tolerance, minArea) {
  const out = [];
  for (const ring of rings) {
    const lngLat = ring.map(toLngLat);
    if (Math.abs(ringArea(lngLat)) < minArea) continue;
    let simple = simplify(lngLat, tolerance).map(([x, y]) => [
      round(x),
      round(y),
    ]);
    if (simple.length < 4) continue;
    const first = simple[0];
    const end = simple[simple.length - 1];
    if (first[0] !== end[0] || first[1] !== end[1]) simple = [...simple, first];
    out.push(simple);
  }
  return out;
}

/** Esri outer rings are clockwise, holes counter-clockwise. */
function toGeoJsonPolygons(rings) {
  const polygons = [];
  for (const ring of rings) {
    const isOuter = ringArea(ring) < 0;
    if (isOuter) polygons.push([ring.slice().reverse()]);
    else if (polygons.length)
      polygons[polygons.length - 1].push(ring.slice().reverse());
  }
  return polygons;
}

/** Spherical ring area in km² (absolute). */
function sphericalRingKm2(ring) {
  const rad = Math.PI / 180;
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += (x2 - x1) * rad * (2 + Math.sin(y1 * rad) + Math.sin(y2 * rad));
  }
  return Math.abs((sum * 6371.0088 * 6371.0088) / 2);
}

function polygonsKm2(polygons) {
  return polygons.reduce(
    (total, [outer, ...holes]) =>
      total +
      sphericalRingKm2(outer) -
      holes.reduce((h, r) => h + sphericalRingKm2(r), 0),
    0,
  );
}

function inRing(point, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function inPolygons(point, polygons) {
  return polygons.some(
    ([outer, ...holes]) =>
      inRing(point, outer) && !holes.some((h) => inRing(point, h)),
  );
}

function parseFacts(html) {
  const text = String(html ?? "")
    .replace(/<img[^>]*>/gi, "")
    .split(/<br\s*\/?>/i)
    .map((line) =>
      line
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim(),
    )
    .filter(Boolean);
  const facts = {};
  for (const line of text) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (m) facts[m[1].trim()] = m[2].trim();
  }
  return facts;
}

const numeric = (value) => {
  const n = Number(String(value ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const res = await fetch(ITEM);
if (!res.ok) throw new Error(`Web map request failed: ${res.status}`);
const webmap = await res.json();
const basinLayer = webmap.operationalLayers.find(
  (l) => l.title === "Major River Basins",
).featureCollection.layers[0];
const shedLayer = webmap.operationalLayers.find(
  (l) => l.title === "National Critical Watersheds",
).featureCollection.layers[0];

const boundaryFeatures = [];
const polygonsBySlug = new Map();
const factsBySlug = {};

for (const feature of basinLayer.featureSet.features) {
  const name = feature.attributes.Name;
  const slug = SLUG_BY_NAME[name];
  if (!slug) continue; // Central Cebu, Iloilo-Batiano: not one of the 18 major basins
  const facts = parseFacts(feature.attributes.Descriptio);
  const wgs = feature.geometry.rings.map((r) => r.map(toLngLat));
  const polygons = toGeoJsonPolygons(wgs);
  polygonsBySlug.set(slug, [...(polygonsBySlug.get(slug) ?? []), ...polygons]);

  const simplified = toGeoJsonPolygons(
    convert(feature.geometry.rings, 0.0012, 1e-6),
  );
  boundaryFeatures.push({
    type: "Feature",
    properties: { slug, name },
    geometry: { type: "MultiPolygon", coordinates: simplified },
  });

  const entry = (factsBySlug[slug] ??= { parts: [] });
  entry.parts.push({
    name,
    areaKm2: Math.round(polygonsKm2(polygons) * 100) / 100,
    regions: facts["Regions"] ?? "",
    provinces: facts["Provinces"] ?? "",
    municipalities: numeric(facts["Municipalities"]),
    barangays: numeric(facts["Barangays"]),
    rivers: facts["Name of Rivers"] ?? "",
    classification: facts["River Classification (2009)"] ?? "",
    hydro: facts["Hydroelectric Power"] ?? "",
    geothermal: facts["Geothermal Power"] ?? "",
    land: facts["Land Clasification"] ?? "",
  });
}

const shedFeatures = [];
for (const feature of shedLayer.featureSet.features) {
  const rings = feature.geometry.rings;
  const wgs = toGeoJsonPolygons(rings.map((r) => r.map(toLngLat)));
  const outer = wgs[0]?.[0];
  if (!outer) continue;
  const centroid = [
    outer.reduce((s, p) => s + p[0], 0) / outer.length,
    outer.reduce((s, p) => s + p[1], 0) / outer.length,
  ];
  let basin = null;
  for (const [slug, polygons] of polygonsBySlug) {
    if (inPolygons(centroid, polygons) || inPolygons(outer[0], polygons)) {
      basin = slug;
      break;
    }
  }
  shedFeatures.push({
    type: "Feature",
    properties: {
      name: String(feature.attributes.NAME ?? "")
        .replace(/\s+/g, " ")
        .trim(),
      region: feature.attributes.REGION ?? "",
      hectares: Math.round(feature.attributes.HECTARES ?? 0),
      basin,
    },
    geometry: {
      type: "MultiPolygon",
      coordinates: toGeoJsonPolygons(convert(rings, 0.002, 1e-7)),
    },
  });
}

// Merge the parts of multi-source basins and attach their critical watersheds.
const facts = {};
for (const [slug, { parts }] of Object.entries(factsBySlug)) {
  const join = (key) => [
    ...new Set(
      parts
        .flatMap((p) => p[key].split(/,\s*|\s{2,}/))
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  const lngLats = boundaryFeatures
    .filter((f) => f.properties.slug === slug)
    .flatMap((f) => f.geometry.coordinates.flat(2));
  const xs = lngLats.map((p) => p[0]);
  const ys = lngLats.map((p) => p[1]);
  facts[slug] = {
    areaKm2: Math.round(parts.reduce((s, p) => s + p.areaKm2, 0) * 100) / 100,
    regions: join("regions"),
    provinces: join("provinces"),
    municipalities:
      parts.reduce((s, p) => s + (p.municipalities ?? 0), 0) || null,
    barangays: parts.reduce((s, p) => s + (p.barangays ?? 0), 0) || null,
    rivers: join("rivers").filter((r) => !/not available/i.test(r)),
    classification: join("classification"),
    hydropower: join("hydro"),
    geothermal: join("geothermal"),
    landClassification: join("land"),
    bounds: [
      Math.min(...xs),
      Math.min(...ys),
      Math.max(...xs),
      Math.max(...ys),
    ].map(round),
    criticalWatersheds: shedFeatures
      .filter((f) => f.properties.basin === slug)
      .map((f) => ({
        name: f.properties.name,
        hectares: f.properties.hectares,
      })),
  };
}

await mkdir("public/data/river-basins", { recursive: true });
await writeFile(
  "public/data/river-basins/boundaries.geojson",
  JSON.stringify({ type: "FeatureCollection", features: boundaryFeatures }),
);
await writeFile(
  "public/data/river-basins/critical-watersheds.geojson",
  JSON.stringify({ type: "FeatureCollection", features: shedFeatures }),
);
await writeFile(
  "lib/config/river-basin-facts.json",
  JSON.stringify(facts, null, 1),
);
console.log(
  "basins",
  Object.keys(facts).length,
  "boundary features",
  boundaryFeatures.length,
  "watersheds",
  shedFeatures.length,
  "assigned",
  shedFeatures.filter((f) => f.properties.basin).length,
);
