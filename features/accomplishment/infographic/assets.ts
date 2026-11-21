import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Fonts and pictures of the infographic image (features/accomplishment/infographic/assets, bundled with the
 * route through outputFileTracingIncludes in next.config.ts). The image renderer reads TTF fonts and PNG / JPEG
 * pictures only, so the site's WOFF2 fonts and WebP photos are kept here converted.
 */

const DIR = path.join(process.cwd(), "features/accomplishment/infographic/assets");

export interface InfographicAssets {
  fonts: { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" }[];
  /** data: URLs. */
  hero: string;
  okbLogo: string;
  dpwhLogo: string;
  bpLogo: string;
}

let loading: Promise<InfographicAssets> | null = null;

const buffer = async (file: string) => {
  const b = await readFile(path.join(DIR, file));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};
const dataUrl = async (file: string, type: string) => `data:${type};base64,${(await readFile(path.join(DIR, file))).toString("base64")}`;

async function load(): Promise<InfographicAssets> {
  const [d600, d700, s400, s600, s700, hero, okbLogo, dpwhLogo, bpLogo] = await Promise.all([
    buffer("barlow-condensed-600-latin.ttf"),
    buffer("barlow-condensed-700-latin.ttf"),
    buffer("source-sans-3-400.ttf"),
    buffer("source-sans-3-600.ttf"),
    buffer("source-sans-3-700.ttf"),
    dataUrl("hero.jpg", "image/jpeg"),
    dataUrl("oplan-kontra-baha-logo.png", "image/png"),
    dataUrl("dpwh-logo.png", "image/png"),
    dataUrl("bagong-pilipinas-logo.png", "image/png"),
  ]);
  return {
    fonts: [
      { name: "Barlow Condensed", data: d600, weight: 600, style: "normal" },
      { name: "Barlow Condensed", data: d700, weight: 700, style: "normal" },
      { name: "Source Sans 3", data: s400, weight: 400, style: "normal" },
      { name: "Source Sans 3", data: s600, weight: 600, style: "normal" },
      { name: "Source Sans 3", data: s700, weight: 700, style: "normal" },
    ],
    hero,
    okbLogo,
    dpwhLogo,
    bpLogo,
  };
}

/** Read once per server instance. */
export function infographicAssets(): Promise<InfographicAssets> {
  loading ??= load().catch((err) => {
    loading = null;
    throw err;
  });
  return loading;
}

/** A field photo from Google Drive as a JPEG / PNG data: URL, or null when it cannot be fetched in time. */
export async function drivePhoto(id: string): Promise<string | null> {
  if (!/^[\w-]{20,}$/.test(id)) return null;
  try {
    const res = await fetch(`https://lh3.googleusercontent.com/d/${id}=w720-h540-c`, {
      headers: { Accept: "image/jpeg,image/png" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86_400 },
    });
    const type = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    if (!res.ok || !["image/jpeg", "image/png"].includes(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length > 3_000_000) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}
