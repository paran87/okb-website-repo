import type { NextRequest } from "next/server";
import driveGallery from "@/lib/config/gallery-drive.json";
import { GALLERY_DRIVE_VIDEOS } from "@/lib/config/gallery-drive-videos";

export const maxDuration = 30;

/** The Drive files of the Gallery (only these can be requested), by id. */
const KNOWN = new Set([
  ...(driveGallery.photos as unknown as [string, ...unknown[]][]).map((p) => p[0]),
  ...GALLERY_DRIVE_VIDEOS.map((v) => v.id),
]);
const WIDTHS = new Set([480, 1600]);
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchImage(id: string, width: number): Promise<Response | null> {
  const urls = [`https://lh3.googleusercontent.com/d/${id}=w${width}`, `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`];
  for (const url of urls) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(15_000) });
        if (res.ok && res.headers.get("content-type")?.startsWith("image/")) return res;
        // Rate limited: wait a little and try again.
        if (res.status === 429) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        else break;
      } catch {
        break;
      }
    }
  }
  return null;
}

/**
 * One photo of the public Google Drive folder (?id=…&w=480|1600), fetched from Google on the server and cached by the
 * CDN. Loading hundreds of pictures straight from Google in the browser gets them rate-limited (HTTP 429).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const width = Number(request.nextUrl.searchParams.get("w") ?? 480);
  if (!KNOWN.has(id) || !WIDTHS.has(width)) return new Response("Not found", { status: 404 });
  const upstream = await fetchImage(id, width);
  if (!upstream) {
    return new Response("Image unavailable", { status: 502, headers: { "Cache-Control": "public, max-age=30, s-maxage=30" } });
  }
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      // A Drive photo does not change: the CDN and the browser keep it for a month.
      "Cache-Control": "public, max-age=2592000, s-maxage=2592000, stale-while-revalidate=86400",
    },
  });
}
