import type { NextRequest } from "next/server";
import { MEDIA_COLLECTIONS, WEBSITE_PUBLIC_PREFIXES } from "@/features/admin/collections";
import { adminName } from "@/features/admin/server/session";
import { TRASH_PREFIX } from "@/features/operations/server/media";
import { getOperationsR2Config, r2Fetch } from "@/features/operations/server/r2";
import { getAccessState } from "@/features/reports/server/access";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PASS_HEADERS = ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"];

function plain(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { "Cache-Control": "private, no-store", "Content-Type": "text/plain" },
  });
}

/**
 * Streams a managed photo or video from R2 through this site (?key=...), with
 * Range support so videos can seek.
 *  - Website gallery files are public.
 *  - Command Center files: signed-in admin or an operator with the access key.
 *  - Files in the trash: signed-in admin only.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!key || key.includes("..") || key.length > 1100) return plain(404, "File not found");

  const inTrash = key.startsWith(TRASH_PREFIX);
  const original = inTrash ? key.slice(TRASH_PREFIX.length) : key;
  if (!MEDIA_COLLECTIONS.some((c) => original.startsWith(c.prefix))) return plain(404, "File not found");
  const isPublic = !inTrash && WEBSITE_PUBLIC_PREFIXES.some((p) => key.startsWith(p));
  if (!isPublic) {
    const admin = Boolean(adminName(request));
    const operator = !inTrash && !admin && (await getAccessState(request, "operations")).granted;
    if (!admin && !operator) return plain(401, "Sign in to view this file.");
  }

  const cfg = getOperationsR2Config();
  if (!cfg) return plain(503, "Media storage is not configured");
  const range = request.headers.get("range");
  const headers: Record<string, string> = range ? { range } : {};
  let upstream: Response;
  try {
    upstream = await r2Fetch(cfg, "GET", key, { headers, signal: AbortSignal.timeout(55_000) });
  } catch {
    return plain(502, "The media storage (Cloudflare R2) could not be reached.");
  }
  if (!upstream.ok && upstream.status !== 206) {
    return plain(upstream.status === 404 ? 404 : 502, "The file could not be loaded from storage.");
  }
  const out = new Headers({ "Cache-Control": isPublic ? "public, max-age=300" : "private, max-age=3600" });
  for (const name of PASS_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}
