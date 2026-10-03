// Turns the simplified basin outlines into small SVG paths for the basin cards.
// Run after scripts/build-river-basin-geo.mjs: node scripts/build-river-basin-shapes.mjs
import { readFile, writeFile } from "node:fs/promises";

const SIZE = 100;
const PAD = 4;
const collection = JSON.parse(await readFile("public/data/river-basins/boundaries.geojson", "utf8"));

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
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = perpendicular(points[i], points[0], points[points.length - 1]);
    if (d > max) {
      max = d;
      index = i;
    }
  }
  if (max <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
}

const bySlug = new Map();
for (const feature of collection.features) {
  const list = bySlug.get(feature.properties.slug) ?? [];
  list.push(...feature.geometry.coordinates);
  bySlug.set(feature.properties.slug, list);
}

const shapes = {};
for (const [slug, polygons] of bySlug) {
  const all = polygons.flat(2);
  const lats = all.map((p) => p[1]);
  const lngs = all.map((p) => p[0]);
  const k = Math.cos((((Math.min(...lats) + Math.max(...lats)) / 2) * Math.PI) / 180);
  const minX = Math.min(...lngs) * k;
  const maxX = Math.max(...lngs) * k;
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const scale = (SIZE - PAD * 2) / Math.max(maxX - minX, maxY - minY);
  const width = (maxX - minX) * scale + PAD * 2;
  const height = (maxY - minY) * scale + PAD * 2;
  const project = ([lng, lat]) => [(lng * k - minX) * scale + PAD, (maxY - lat) * scale + PAD];

  let d = "";
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const pts = simplify(ring.map(project), 0.35);
      if (pts.length < 4) continue;
      d += `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L")}Z`;
    }
  }
  shapes[slug] = { d, w: Math.round(width * 10) / 10, h: Math.round(height * 10) / 10 };
}

await writeFile("lib/config/river-basin-shapes.json", JSON.stringify(shapes));
console.log("shapes:", Object.keys(shapes).length, "bytes:", JSON.stringify(shapes).length);
