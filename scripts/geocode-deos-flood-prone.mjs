import fs from "fs";
import path from "path";

const rawPath = path.resolve("features/flood-prone/data/deos-flood-prone-raw.json");
const outPath = path.resolve("features/flood-prone/data/deos-flood-prone.json");
const cachePath = path.resolve("features/flood-prone/data/deos-geocode-cache.json");

const DEO_CENTROIDS = {
  "North Manila": [120.989, 14.61],
  "South Manila": [120.984, 14.552],
  "Quezon City 1st": [121.038, 14.676],
  "Quezon City 2nd": [121.05, 14.635],
  "Metro Manila 1st": [121.021, 14.659],
  "Metro Manila 2nd": [121.042, 14.618],
  "Metro Manila 3rd": [121.033, 14.579],
  "Las Piñas - Muntinlupa": [121.028, 14.423],
  "Malabon - Navotas": [120.957, 14.67],
};

const entries = JSON.parse(fs.readFileSync(rawPath, "utf8"));
const cache = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, "utf8"))
  : {};

function buildQuery(description) {
  const primary = description.split("(")[0].trim();
  const cleaned = primary
    .replace(/\b(S\d{5}LZ|Chainage|KM|K\d{4}[+-]\d+)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${cleaned}, Metro Manila, Philippines`;
}

function centroidFallback(deo, index) {
  const [lng, lat] = DEO_CENTROIDS[deo] ?? [121.03, 14.6];
  const jitter = (index % 7) * 0.002 - 0.006;
  return [lng + jitter, lat + jitter * 0.7];
}

async function geocode(query) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ph");

  const res = await fetch(url, {
    headers: { "User-Agent": "OKB-Command-Center/1.0 (DPWH flood-prone mapping)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.length) return null;
  return [Number(data[0].lon), Number(data[0].lat)];
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const features = [];
let nominatimHits = 0;
let fallbackHits = 0;

for (let i = 0; i < entries.length; i++) {
  const entry = entries[i];
  if (cache[entry.id]) {
    features.push(cache[entry.id].feature);
    if (cache[entry.id].method === "nominatim") nominatimHits++;
    else fallbackHits++;
    continue;
  }

  const query = buildQuery(entry.description);
  let coords = null;
  let method = "centroid";

  try {
    coords = await geocode(query);
    if (coords) {
      method = "nominatim";
      nominatimHits++;
    }
  } catch {
    /* fall through to centroid */
  }

  if (!coords) {
    coords = centroidFallback(entry.deo, entry.index);
    fallbackHits++;
  }

  const shortTitle =
    entry.description.length > 72
      ? `${entry.description.slice(0, 69)}…`
      : entry.description;

  const feature = {
    type: "Feature",
    properties: {
      id: entry.id,
      title: shortTitle,
      description: entry.description,
      deo: entry.deo,
      index: entry.index,
      category: "flood-prone",
      geocodeMethod: method,
    },
    geometry: { type: "Point", coordinates: coords },
  };

  features.push(feature);
  cache[entry.id] = { method, feature };
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));

  process.stdout.write(`\r${i + 1}/${entries.length} (${method})`);
  await sleep(1100);
}

const collection = { type: "FeatureCollection", features };
fs.writeFileSync(outPath, JSON.stringify(collection, null, 2), "utf8");

console.log(`\nWrote ${features.length} features to ${outPath}`);
console.log(`Nominatim: ${nominatimHits}, centroid fallback: ${fallbackHits}`);
