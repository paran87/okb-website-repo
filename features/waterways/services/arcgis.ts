import "server-only";
import {
  ALL_CLASSES,
  ALL_URBS,
  DISCHARGE_CLASSES,
  OVERLAYS,
  URBS,
  type DischargeClassId,
  type IdentifiedSegment,
  type LngLatBounds,
  type RiverResult,
  type UrbCode,
  type WaterwayStats,
} from "@/features/waterways/config";

/** DENR INREMP GDSS map service (river system = layer 14). */
const SERVICE =
  "https://fmbfsd.denr.gov.ph/server/rest/services/INREMP_GDSS_MIL1/MapServer";
const RIVER_LAYER = 14;
const WORLD = 40075016.68557849;
const MAX_PARALLEL = 4;
const TIMEOUT_MS = 45_000;

/** Transparent 1x1 PNG, used for tiles outside the covered basins. */
export const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAHf2yWAAAAABJRU5ErkJggg==",
  "base64",
);

let running = 0;
const waiting: (() => void)[] = [];
/** Keep a polite cap on simultaneous requests to the government server. */
async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL)
    await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
  try {
    return await task();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

function toQuery(params: Record<string, string | number>): string {
  return new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
}

async function getJson<T>(
  path: string,
  params: Record<string, string | number>,
  revalidate?: number,
): Promise<T> {
  const res = await limited(() =>
    fetch(`${SERVICE}/${path}?${toQuery({ f: "json", ...params })}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      ...(revalidate
        ? { next: { revalidate } }
        : { cache: "no-store" as const }),
    }),
  );
  if (!res.ok) throw new Error(`DENR service responded ${res.status}`);
  const body = (await res.json()) as T & { error?: { message?: string } };
  if (body.error) throw new Error(body.error.message ?? "DENR service error");
  return body;
}

export function tileBounds3857(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const span = WORLD / 2 ** z;
  const minX = -WORLD / 2 + x * span;
  const maxY = WORLD / 2 - y * span;
  return [minX, maxY - span, minX + span, maxY];
}

function lngLatToMercator(lng: number, lat: number): [number, number] {
  return [
    (lng * Math.PI * 6378137) / 180,
    Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 6378137,
  ];
}

function mercatorToLngLat(x: number, y: number): [number, number] {
  return [
    (x / 6378137) * (180 / Math.PI),
    (2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * (180 / Math.PI),
  ];
}

/** True when a Web Mercator tile touches one of the covered basins. */
export function tileTouchesBasins(z: number, x: number, y: number): boolean {
  const [minX, minY, maxX, maxY] = tileBounds3857(z, x, y);
  const pad = 0.05;
  return URBS.some(({ bounds: [w, s, e, n] }) => {
    const [bx0, by0] = lngLatToMercator(w - pad, s - pad);
    const [bx1, by1] = lngLatToMercator(e + pad, n + pad);
    return bx0 <= maxX && bx1 >= minX && by0 <= maxY && by1 >= minY;
  });
}

/** SQL-ish definition expression from allow-listed ids only (never raw client text). */
export function buildWhere(
  urbs: UrbCode[],
  classes: DischargeClassId[],
): string | null {
  const parts: string[] = [];
  if (urbs.length > 0 && urbs.length < ALL_URBS.length) {
    parts.push(`urb_code IN (${urbs.map((u) => `'${u}'`).join(",")})`);
  }
  if (classes.length > 0 && classes.length < ALL_CLASSES.length) {
    parts.push(
      `(${DISCHARGE_CLASSES.filter((c) => classes.includes(c.id))
        .map((c) => c.where)
        .join(" OR ")})`,
    );
  }
  return parts.length ? parts.join(" AND ") : null;
}

export function parseUrbs(value: string | null): UrbCode[] {
  return (value ?? "")
    .split(",")
    .filter((v): v is UrbCode => (ALL_URBS as string[]).includes(v));
}

export function parseClasses(value: string | null): DischargeClassId[] {
  return (value ?? "")
    .split(",")
    .filter((v): v is DischargeClassId =>
      (ALL_CLASSES as string[]).includes(v),
    );
}

export function parseOverlay(value: string | null): number | null {
  const found = OVERLAYS.find((o) => o.id === value);
  return found ? found.layer : null;
}

/** River renderer scaled with zoom so lines stay readable from basin to street level. */
function riverDynamicLayers(z: number, where: string | null) {
  const scale =
    z <= 7 ? 0.8 : z <= 9 ? 1.1 : z <= 11 ? 1.6 : z <= 13 ? 2.4 : 3.4;
  const maxes = [0.0001, 5, 50, 1e9];
  return JSON.stringify([
    {
      id: RIVER_LAYER,
      source: { type: "mapLayer", mapLayerId: RIVER_LAYER },
      ...(where ? { definitionExpression: where } : {}),
      drawingInfo: {
        renderer: {
          type: "classBreaks",
          field: "discharge_rate",
          minValue: 0,
          classBreakInfos: DISCHARGE_CLASSES.map((c, i) => ({
            classMaxValue: maxes[i],
            symbol: {
              type: "esriSLS",
              style: "esriSLSSolid",
              color: [...c.color, 255],
              width: Math.round(c.width * scale * 10) / 10,
            },
          })),
        },
      },
    },
  ]);
}

/** PNG tile of the river system (styled by discharge) or of a reference layer. */
export async function renderTile(opts: {
  z: number;
  x: number;
  y: number;
  overlayLayer: number | null;
  urbs: UrbCode[];
  classes: DischargeClassId[];
}): Promise<Buffer> {
  const { z, x, y, overlayLayer } = opts;
  const bbox = tileBounds3857(z, x, y);
  const params: Record<string, string | number> = {
    bbox: bbox.join(","),
    bboxSR: 3857,
    imageSR: 3857,
    size: "512,512",
    format: "png32",
    transparent: "true",
    f: "image",
  };
  if (overlayLayer === null)
    params.dynamicLayers = riverDynamicLayers(
      z,
      buildWhere(opts.urbs, opts.classes),
    );
  else params.layers = `show:${overlayLayer}`;

  const res = await limited(() =>
    fetch(`${SERVICE}/export?${toQuery(params)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    }),
  );
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("image")) {
    throw new Error(`Tile export failed (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}

type EsriPaths = { paths: number[][][] };

function pathsToMultiLine(
  geometry: EsriPaths,
  projected: boolean,
): GeoJSON.MultiLineString {
  return {
    type: "MultiLineString",
    coordinates: geometry.paths.map((path) =>
      path.map(([px, py]) => {
        const [lng, lat] = projected ? mercatorToLngLat(px!, py!) : [px!, py!];
        return [Math.round(lng * 1e5) / 1e5, Math.round(lat * 1e5) / 1e5];
      }),
    ),
  };
}

function distanceToPaths(x: number, y: number, geometry: EsriPaths): number {
  let best = Infinity;
  for (const path of geometry.paths) {
    for (let i = 1; i < path.length; i += 1) {
      const [x1, y1] = path[i - 1] as [number, number];
      const [x2, y2] = path[i] as [number, number];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      const t =
        lenSq === 0
          ? 0
          : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lenSq));
      best = Math.min(best, Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)));
    }
  }
  return best;
}

/** The river segment under a map click, if any. */
export async function identifyRiver(
  lng: number,
  lat: number,
  zoom: number,
): Promise<IdentifiedSegment | null> {
  const [x, y] = lngLatToMercator(lng, lat);
  const span = WORLD / 2 ** zoom;
  const data = await getJson<{
    results?: { attributes: Record<string, string>; geometry?: EsriPaths }[];
  }>("identify", {
    geometry: `${x},${y}`,
    geometryType: "esriGeometryPoint",
    sr: 3857,
    layers: `all:${RIVER_LAYER}`,
    tolerance: 7,
    mapExtent: `${x - span / 2},${y - span / 2},${x + span / 2},${y + span / 2}`,
    imageDisplay: "512,512,96",
    returnGeometry: "true",
    maxAllowableOffset: Math.max(1, span / 512),
  });
  const hits = (data.results ?? []).filter((r) => r.geometry);
  if (hits.length === 0) return null;
  hits.sort(
    (a, b) =>
      distanceToPaths(x, y, a.geometry!) - distanceToPaths(x, y, b.geometry!),
  );
  const best = hits[0]!;
  const a = best.attributes;
  const river = (a["River Name"] ?? "").trim();
  const discharge = Number(a["Discharge Rate"]);
  return {
    objectId: Number(a["OBJECTID"]),
    basin: a["Upper River Basin"] ?? "",
    river: river && river !== "N/A" ? river : null,
    discharge: Number.isFinite(discharge) ? discharge : null,
    lengthM: Number(a["Length(m)"]) || 0,
    geometry: pathsToMultiLine(best.geometry!, true),
  };
}

type StatRow = { attributes: Record<string, number | string | null> };

async function stat(where: string, groupBy?: string): Promise<StatRow[]> {
  const data = await getJson<{ features: StatRow[] }>(
    `${RIVER_LAYER}/query`,
    {
      where,
      outStatistics: JSON.stringify([
        {
          statisticType: "count",
          onStatisticField: "OBJECTID",
          outStatisticFieldName: "n",
        },
        {
          statisticType: "sum",
          onStatisticField: "length",
          outStatisticFieldName: "m",
        },
        {
          statisticType: "max",
          onStatisticField: "discharge_rate",
          outStatisticFieldName: "maxq",
        },
      ]),
      ...(groupBy ? { groupByFieldsForStatistics: groupBy } : {}),
    },
    86_400,
  );
  return data.features;
}

/** Network totals, per-basin and per-class summaries, and the named rivers. */
export async function fetchStats(): Promise<WaterwayStats> {
  const [byUrbRows, classRows, riverRows] = await Promise.all([
    stat("1=1", "urb_code"),
    Promise.all(DISCHARGE_CLASSES.map((c) => stat(c.where))),
    stat(
      "river_name <> 'N/A' AND river_name <> ' ' AND river_name IS NOT NULL",
      "river_name,urb_code",
    ),
  ]);
  const num = (v: unknown) => (typeof v === "number" ? v : 0);
  const byUrb = byUrbRows
    .map((r) => ({
      code: String(r.attributes.urb_code) as UrbCode,
      segments: num(r.attributes.n),
      km: num(r.attributes.m) / 1000,
      maxDischarge:
        typeof r.attributes.maxq === "number" ? r.attributes.maxq : null,
    }))
    .filter((r) => (ALL_URBS as string[]).includes(r.code))
    .sort((a, b) => a.code.localeCompare(b.code));
  const byClass = DISCHARGE_CLASSES.map((c, i) => ({
    id: c.id,
    segments: num(classRows[i]?.[0]?.attributes.n),
    km: num(classRows[i]?.[0]?.attributes.m) / 1000,
  }));
  const rivers = riverRows
    .map((r) => ({
      name: String(r.attributes.river_name).trim(),
      code: String(r.attributes.urb_code) as UrbCode,
      segments: num(r.attributes.n),
      km: num(r.attributes.m) / 1000,
      maxDischarge:
        typeof r.attributes.maxq === "number" ? r.attributes.maxq : null,
    }))
    .sort((a, b) => b.km - a.km);
  return {
    totals: {
      segments: byUrb.reduce((s, r) => s + r.segments, 0),
      km: byUrb.reduce((s, r) => s + r.km, 0),
    },
    byUrb,
    byClass,
    rivers,
  };
}

/** All segments of one named river, merged into a single line for highlighting. */
export async function fetchRiver(name: string): Promise<RiverResult | null> {
  const safe = name.replace(/'/g, "''");
  const data = await getJson<{
    features: {
      attributes: Record<string, number | string | null>;
      geometry?: EsriPaths;
    }[];
  }>(
    `${RIVER_LAYER}/query`,
    {
      where: `river_name = '${safe}'`,
      outFields: "urb_code,river_name,discharge_rate,length",
      returnGeometry: "true",
      outSR: 4326,
      maxAllowableOffset: 0.0003,
      resultRecordCount: 2000,
    },
    3_600,
  );
  const features = data.features.filter((f) => f.geometry);
  if (features.length === 0) return null;
  const lines = features.flatMap(
    (f) => pathsToMultiLine(f.geometry!, false).coordinates,
  );
  const points = lines.flat();
  const xs = points.map((p) => p[0]!);
  const ys = points.map((p) => p[1]!);
  const bounds: LngLatBounds = [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ];
  const codes = new Set(features.map((f) => String(f.attributes.urb_code)));
  const discharge = features
    .map((f) => f.attributes.discharge_rate)
    .filter((v): v is number => typeof v === "number");
  return {
    name,
    segments: features.length,
    km:
      features.reduce((s, f) => s + Number(f.attributes.length ?? 0), 0) / 1000,
    maxDischarge: discharge.length ? Math.max(...discharge) : null,
    basins: URBS.filter((u) => codes.has(u.code)).map((u) => u.name),
    bounds,
    geometry: { type: "MultiLineString", coordinates: lines },
  };
}

/** Legend swatches of the hazard layers, as data URLs. */
export async function fetchLegend(): Promise<
  Record<number, { label: string; image: string }[]>
> {
  const data = await getJson<{
    layers: {
      layerId: number;
      legend: { label: string; contentType: string; imageData: string }[];
    }[];
  }>("legend", {}, 86_400);
  const out: Record<number, { label: string; image: string }[]> = {};
  for (const layer of data.layers) {
    if (
      OVERLAYS.some((o) => o.layer === layer.layerId) &&
      layer.legend.some((l) => l.label)
    ) {
      out[layer.layerId] = layer.legend.map((l) => ({
        label: l.label,
        image: `data:${l.contentType};base64,${l.imageData}`,
      }));
    }
  }
  return out;
}
