import type { NextRequest } from "next/server";
import { requireAdmin } from "@/features/admin/server/session";
import { SCREENSHOT_KEY } from "@/features/feedback/server/service";
import { getOperationsR2Config, r2Fetch } from "@/features/operations/server/r2";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** A feedback screenshot (admins only: it may show what the sender had on screen). */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    requireAdmin(request);
  } catch {
    return new Response("Sign in to the Admin page.", { status: 401 });
  }
  const key = request.nextUrl.searchParams.get("key") ?? "";
  const cfg = getOperationsR2Config();
  if (!SCREENSHOT_KEY.test(key) || !cfg) return new Response("Screenshot not found", { status: 404 });
  const upstream = await r2Fetch(cfg, "GET", key, { signal: AbortSignal.timeout(25_000) });
  if (!upstream.ok) return new Response("The screenshot could not be loaded.", { status: upstream.status === 404 ? 404 : 502 });
  return new Response(upstream.body, {
    headers: { "Cache-Control": "private, max-age=3600", "Content-Type": TYPES[key.split(".").pop() ?? ""] ?? "image/jpeg" },
  });
}
