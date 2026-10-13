import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getOperationsR2Config } from "@/features/operations/server/r2";
import { getAdminConfig } from "@/features/admin/server/config";
import {
  adminKeyMatches,
  adminName,
  assertSameOrigin,
  clearAdminCookie,
  setAdminCookie,
} from "@/features/admin/server/session";
import { siteDbConfigured, siteDbReady, supabaseProjectRef } from "@/features/admin/server/supabase";
import type { AdminState } from "@/features/admin/types";

export const dynamic = "force-dynamic";

/** Sign-in state and what is connected (no data). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const cfg = getAdminConfig();
  const name = adminName(request);
  const r2 = getOperationsR2Config();
  const state: AdminState = {
    configured: Boolean(cfg.adminKey),
    granted: Boolean(name),
    name,
    usingFallbackKey: cfg.usingFallbackKey,
    supabase: {
      configured: siteDbConfigured(),
      ready: name ? await siteDbReady() : false,
      projectRef: name ? supabaseProjectRef() : null,
    },
    storage: { configured: Boolean(r2), bucket: name ? (r2?.bucket ?? null) : null },
  };
  const response = ok(state);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});

// Best-effort brute-force brake per server instance.
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

const loginSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  key: z.string().min(1, "Enter the admin key").max(500),
});

/** Sign in with the admin key. */
export const POST = withApiHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.until > now && entry.count >= MAX_ATTEMPTS) {
    throw new ApiError(429, "RATE_LIMITED", "Too many attempts. Try again in 15 minutes.");
  }
  if (!getAdminConfig().adminKey) {
    throw new ApiError(403, "FORBIDDEN", "Admin access is not configured on the server. Set OKB_ADMIN_KEY.", {
      reason: "access_not_configured",
    });
  }
  const body = loginSchema.parse(await request.json());
  if (!adminKeyMatches(body.key)) {
    attempts.set(ip, { count: (entry && entry.until > now ? entry.count : 0) + 1, until: now + WINDOW_MS });
    await new Promise((r) => setTimeout(r, 600));
    throw new ApiError(401, "UNAUTHORIZED", "That admin key is not correct.");
  }
  attempts.delete(ip);
  const response = ok({ granted: true, name: body.name });
  setAdminCookie(response, body.name);
  return response;
});

/** Sign out. */
export const DELETE = withApiHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  const response = ok({ granted: false });
  clearAdminCookie(response);
  return response;
});

