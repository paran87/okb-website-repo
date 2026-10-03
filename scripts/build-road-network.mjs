// Downloads the DPWH national road network + expressways from the public
// "Road Classification" ArcGIS service and writes compact GeoJSON for the app.
// Run: node scripts/build-road-network.mjs
import { mkdir, writeFile } from "node:fs/promises";

const BASE =
  "https://services1.arcgis.com/IwZZTMxZCmAmFYvF/arcgis/rest/services/Road_Classification/FeatureServer";
const PAGE = 1000;
const TOLERANCE = 0.0002; // degrees (~22 m): crisp at street zoom, small on disk

const CLASS_CODE = { Primary: "P", Secondary: "S", Tertiary: "T" };
const round = (n) => Math.round(n * 1e5) / 1e5;

async function query(layer, params, attempt = 1) {
  const url = `${BASE}/${layer}/query?${new URLSearchParams(params)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (body.error) throw new Error(body.error.message);
    return body;
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return query(layer, params, attempt + 1);
  }
}

async function fetchAll(layer, outFields) {
  const features = [];
  for (let offset = 0; ; offset += PAGE) {
    const page = await query(layer, {
      where: "1=1",
      outFields,
      outSR: "4326",
      maxAllowableOffset: String(TOLERANCE),
      orderByFields: "OBJECTID",
      resultOffset: String(offset),
      resultRecordCount: String(PAGE),
      f: "geojson",
    });
    features.push(...page.features);
    console.log(`layer ${layer}: ${features.length}`);
    if (page.features.length < PAGE) break;
  }
  return features;
}

const REGION_NAMES = {
  "National Capital Region": "NCR",
  "Cordillera Administrative Region": "CAR",
  "Bangsamoro Autonomous Region in M": "BARMM",
  "MIMAROPA Region": "MIMAROPA",
  "Negros Island Region": "NIR",
};
const region = (v) => REGION_NAMES[trim(v)] ?? trim(v) ?? "";

function lengthMeters(geometry) {
  const lines = geometry.type === "LineString" ? [geometry.coordinates] : geometry.coordinates;
  let total = 0;
  for (const line of lines) {
    for (let i = 1; i < line.length; i += 1) {
      const [x1, y1] = line[i - 1];
      const [x2, y2] = line[i];
      const dx = ((x2 - x1) * Math.PI * 6371008.8 * Math.cos(((y1 + y2) / 2) * (Math.PI / 180))) / 180;
      const dy = ((y2 - y1) * Math.PI * 6371008.8) / 180;
      total += Math.hypot(dx, dy);
    }
  }
  return Math.round(total);
}

const trim = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : v);

function compactGeometry(geometry) {
  if (geometry.type === "LineString") {
    return { type: "LineString", coordinates: geometry.coordinates.map(([x, y]) => [round(x), round(y)]) };
  }
  return {
    type: "MultiLineString",
    coordinates: geometry.coordinates.map((line) => line.map(([x, y]) => [round(x), round(y)])),
  };
}

const roads = (
  await fetchAll(
    1,
    "OBJECTID,ISLAND,REGION,PROVINCE,DEO,ROAD_NAME,SECTION_ID,DIRECTION,SEC_LENGTH,ROAD_SEC_CLASS,ROUTE_NO,CONG_DIST,REMARKS,ROAD_ID,ROUTE_ID",
  )
)
  .filter((f) => f.geometry)
  .map((f) => {
    const p = f.properties;
    return {
      type: "Feature",
      id: p.OBJECTID,
      properties: {
        id: p.OBJECTID,
        name: trim(p.ROAD_NAME) || "Unnamed road",
        cls: CLASS_CODE[trim(p.ROAD_SEC_CLASS)] ?? "T",
        island: trim(p.ISLAND) ?? "",
        region: region(p.REGION),
        province: trim(p.PROVINCE) ?? "",
        deo: trim(p.DEO) ?? "",
        len: Math.round(p.SEC_LENGTH ?? 0),
        section: trim(p.SECTION_ID) ?? "",
        dir: trim(p.DIRECTION) ?? "",
        route: trim(p.ROUTE_NO) ?? "",
        roadId: trim(p.ROAD_ID) ?? "",
        district: trim(p.CONG_DIST) ?? "",
        remarks: trim(p.REMARKS) ?? "",
      },
      geometry: compactGeometry(f.geometry),
    };
  });

const expressways = (
  await fetchAll(0, "OBJECTID,ISLAND,REGION,XPRES_WAY,XPRES_NAME,LENGTH,ROAD_CLASS,ROUTE_NO,STATUS,PROJECT")
)
  .filter((f) => f.geometry)
  .map((f) => {
    const p = f.properties;
    return {
      type: "Feature",
      id: p.OBJECTID,
      properties: {
        id: p.OBJECTID,
        name: trim(p.XPRES_NAME) || trim(p.XPRES_WAY) || "Expressway",
        way: trim(p.XPRES_WAY) ?? "",
        island: trim(p.ISLAND) ?? "",
        region: region(p.REGION),
        len: lengthMeters(f.geometry),
        route: trim(p.ROUTE_NO) ?? "",
        status: trim(p.STATUS) ?? "",
        project: trim(p.PROJECT) ?? "",
      },
      geometry: compactGeometry(f.geometry),
    };
  });

await mkdir("public/data/road-network", { recursive: true });
await writeFile("public/data/road-network/roads.geojson", JSON.stringify({ type: "FeatureCollection", features: roads }));
await writeFile("public/data/road-network/expressways.geojson", JSON.stringify({ type: "FeatureCollection", features: expressways }));
console.log("roads", roads.length, "expressways", expressways.length);
