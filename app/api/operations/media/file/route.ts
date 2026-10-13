import type { NextRequest } from "next/server";
import { OPERATIONS_SECTIONS } from "@/features/operations/config";
import { getOperationsR2Config, presign } from "@/features/operations/server/r2";
import { getAccessState } from "@/features/reports/server/access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PASS_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
];

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "Cache-Control": "private, no-store", "Content-Type": "text/plain" },
  });
}

/**
 * Streams one gallery photo or video from R2 through this site (?key=...). Browsers load
 * media from the same origin, so a network that blocks the r2.cloudflarestorage.com host
 * no longer breaks the pictures. Range requests pass through, so videos can seek.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const state = await getAccessState(request, "operations");
  if (!state.granted) return plain(401, "Enter the operator access key to view operations media.");

  const key = request.nextUrl.searchParams.get("key") ?? "";
  const inSection = OPERATIONS_SECTIONS.some((s) => s.prefix && key.startsWith(s.prefix));
  if (!inSection || key.includes("..")) return plain(404, "File not found");
  const cfg = getOperationsR2Config();
  if (!cfg) return plain(503, "Media storage is not configured");

  const range = request.headers.get("range");
  const headers: Record<string, string> = range ? { range } : {};
  let upstream: Response;
  try {
    upstream = await fetch(presign(cfg, "GET", key, { headers, expiresIn: 300 }), {
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    return plain(502, "The media storage (Cloudflare R2) could not be reached.");
  }
  if (!upstream.ok && upstream.status !== 206) {
    return plain(upstream.status === 404 ? 404 : 502, "The file could not be loaded from storage.");
  }
  const out = new Headers({ "Cache-Control": "private, max-age=3600" });
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
