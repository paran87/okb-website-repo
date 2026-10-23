// Builds lib/config/coverage-geo.json: map geometry for program coverage names that
// the live accomplishment dashboard does not trace yet, so their coverage chip can
// still show exactly where they are.
// Source: OpenStreetMap through Nominatim (© OpenStreetMap contributors, ODbL).
// Run: node scripts/build-coverage-geo.mjs
import { writeFile } from "node:fs/promises";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA = "okb-website-build/1.0 (coverage geometry)";
const LIMIT = 40; // Nominatim's maximum results per request

/**
 * Coverage name (as the website shows it from the OKB SSOT sheet, readableName in
 * features/accomplishment/lib/coverage.ts) -> its OSM geometry.
 * osm: every way with exactly that name and category inside bbox [w, s, e, n].
 * place: an OSM place to pin when the line itself is not mapped anywhere.
 */
const SOURCES = {
  "Meycuayan River": { osm: "Meycauayan River", category: "waterway", bbox: [120.85, 14.65, 121.1, 14.85] },
  "Kalaw Ave.": { osm: "Kalaw Avenue", category: "highway", bbox: [120.97, 14.57, 120.995, 14.59] },
  "Espana Blvd": { osm: "España Boulevard", category: "highway", bbox: [120.98, 14.6, 121.01, 14.625] },
  "Tayuman St.": { osm: "Tayuman Street", category: "highway", bbox: [120.96, 14.61, 120.995, 14.625] },
  "Mt. Samat Rd (S04820LZ)": { osm: "Mount Samat Road", category: "highway", bbox: [120.45, 14.55, 120.6, 14.65] },
  "Digal Creek": {
    place: "Digal, Buluan, Maguindanao del Sur",
    note: "The creek itself is not mapped yet; the pin marks Barangay Digal, Buluan.",
  },
};

const round = ([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nominatim(params) {
  const url = `${NOMINATIM}?${new URLSearchParams({ format: "geojson", countrycodes: "ph", ...params })}`;
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Nominatim ${res.status} for ${params.q}`);
  await sleep(1100); // usage policy: at most one request per second
  return (await res.json()).features;
}

/** Every OSM way named `name` in bbox; a full page means there may be more, so split the box. */
async function ways(name, bbox, found = new Map()) {
  const [w, s, e, n] = bbox;
  const page = await nominatim({ q: name, limit: String(LIMIT), dedupe: "0", polygon_geojson: "1", viewbox: `${w},${n},${e},${s}`, bounded: "1" });
  for (const f of page) found.set(`${f.properties.osm_type}${f.properties.osm_id}`, f);
  if (page.length >= LIMIT) {
    const [mx, my] = [(w + e) / 2, (s + n) / 2];
    for (const box of [[w, s, mx, my], [mx, s, e, my], [w, my, mx, n], [mx, my, e, n]]) await ways(name, box, found);
  }
  return found;
}

const out = {};

for (const [name, src] of Object.entries(SOURCES)) {
  if (src.osm) {
    const lines = [...(await ways(src.osm, src.bbox)).values()]
      .filter((f) => f.properties.name === src.osm && f.properties.category === src.category && f.properties.type !== "service")
      .flatMap((f) => (f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.type === "MultiLineString" ? f.geometry.coordinates : []));
    out[name] = { lines: lines.map((l) => l.map(round)) };
  } else if (src.place) {
    const [hit] = await nominatim({ q: src.place, limit: "1" });
    if (!hit) throw new Error(`No place found for ${src.place}`);
    out[name] = { lines: [], point: round(hit.geometry.coordinates), note: src.note };
  }
  const entry = out[name];
  if (!entry.lines.length && !entry.point) throw new Error(`No geometry for ${name}`);
  console.log(`${name}: ${entry.lines.length} lines${entry.point ? ", 1 point" : ""}`);
}

await writeFile("lib/config/coverage-geo.json", `${JSON.stringify(out)}\n`);
console.log("Wrote lib/config/coverage-geo.json");
