import "server-only";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

/**
 * Per-IP request limits for the public flood report endpoints (per server instance; enough to stop a
 * script from flooding R2 or the report list, not a substitute for a WAF). Limits are generous because
 * Philippine mobile networks put many phones behind one shared address.
 */

const windows = new Map<string, number[]>();

export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export function rateLimit(request: NextRequest, bucket: string, limit: number, windowMs: number): void {
  const key = `${bucket}:${clientIp(request)}`;
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    throw new ApiError(429, "RATE_LIMITED", "Too many requests. Please wait a few minutes and try again.");
  }
  hits.push(now);
  windows.set(key, hits);
  if (windows.size > 5000) {
    for (const [k, v] of windows) if (!v.some((t) => now - t < windowMs)) windows.delete(k);
  }
}
