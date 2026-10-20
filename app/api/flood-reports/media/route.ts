import type { NextRequest } from "next/server";
import { getOperationsR2Config, r2Fetch } from "@/features/operations/server/r2";
import { MEDIA_KEY } from "@/features/flood-report/server/media";
import { VIDEO_KEY } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PASS_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" },
  });
}

/**
 * Streams a photo or video OKB operators added to a flood report (?key=report-media/...), or a video a sender
 * recorded on the OKB Mobile page (?key=flood-reports/....mp4), with Range support
 * so videos can seek. Public, like the maps that show it; keys are random. Operators can delete files, so the
 * CDN keeps a copy for 5 minutes only.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!MEDIA_KEY.test(key) && !VIDEO_KEY.test(key)) return plain(404, "File not found");
  const cfg = getOperationsR2Config();
  if (!cfg) return plain(503, "Media storage is not configured");
  const range = request.headers.get("range");
  let upstream: Response;
  try {
    upstream = await r2Fetch(cfg, "GET", key, { headers: range ? { range } : {}, signal: AbortSignal.timeout(55_000) });
  } catch {
    return plain(502, "The media storage could not be reached.");
  }
  if (!upstream.ok && upstream.status !== 206) return plain(upstream.status === 404 ? 404 : 502, "The file could not be loaded.");
  const headers = new Headers({ "Cache-Control": "public, max-age=3600, s-maxage=300" });
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
