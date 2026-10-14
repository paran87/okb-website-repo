import type { NextRequest } from "next/server";
import { GALLERY_DRIVE_VIDEOS } from "@/lib/config/gallery-drive-videos";

export const maxDuration = 60;

const KNOWN = new Set(GALLERY_DRIVE_VIDEOS.map((v) => v.id));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const PASS = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];

/**
 * Streams one video of the Gallery's Google Drive folder (?id=…) through this site, with Range support so the
 * browser's own player can start at once and seek. Google refuses to serve these files straight to a page on
 * another site (the browser gets an error page instead of the video), so the server fetches them.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!KNOWN.has(id)) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = { "User-Agent": UA };
  const range = request.headers.get("range");
  if (range) headers.Range = range;

  let upstream: Response;
  try {
    upstream = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, {
      headers,
      cache: "no-store",
      redirect: "follow",
      signal: request.signal,
    });
  } catch {
    return new Response("The video could not be reached.", { status: 502 });
  }
  const type = upstream.headers.get("content-type") ?? "";
  if ((!upstream.ok && upstream.status !== 206) || !type.startsWith("video/") || !upstream.body) {
    return new Response("The video is not available right now.", { status: 502 });
  }
  const out = new Headers({ "Cache-Control": "public, max-age=3600" });
  for (const name of PASS) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  if (!out.has("accept-ranges")) out.set("Accept-Ranges", "bytes");
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
