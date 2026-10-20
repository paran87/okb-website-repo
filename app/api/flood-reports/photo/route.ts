import type { NextRequest } from "next/server";
import { getOperationsR2Config, r2Fetch } from "@/features/operations/server/r2";
import { PHOTO_KEY } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "text/plain" },
  });
}

/**
 * Streams a mobile flood report photo from R2 (?key=flood-reports/...). Public, like the map that shows
 * it; keys are random, and photos never change once stored, so browsers and the CDN may keep them.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!PHOTO_KEY.test(key)) return plain(404, "Photo not found");
  const cfg = getOperationsR2Config();
  if (!cfg) return plain(503, "Photo storage is not configured");
  let upstream: Response;
  try {
    upstream = await r2Fetch(cfg, "GET", key, { signal: AbortSignal.timeout(25_000) });
  } catch {
    return plain(502, "The photo storage could not be reached.");
  }
  if (!upstream.ok) return plain(upstream.status === 404 ? 404 : 502, "The photo could not be loaded.");
  const headers = new Headers({
    "Cache-Control": "public, max-age=604800, immutable",
    "Content-Type": "image/jpeg",
  });
  const size = upstream.headers.get("content-length");
  if (size) headers.set("Content-Length", size);
  return new Response(upstream.body, { status: 200, headers });
}
