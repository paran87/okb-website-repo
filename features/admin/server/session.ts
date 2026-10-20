import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { getAdminConfig, type AdminConfig } from "@/features/admin/server/config";

/**
 * Admin sign-in: a signed, httpOnly cookie issued after entering the admin key.
 * Same model as the operator access cookie (features/reports/server/access.ts);
 * changing the key signs every admin out.
 */

const COOKIE = "okb_admin";
const MAX_AGE_S = 12 * 60 * 60;

interface Grant {
  n: string;
  exp: number;
}

function signingKey(cfg: AdminConfig): string {
  return `${cfg.authSecret}::okb-admin::${cfg.adminKey ?? ""}`;
}

function sign(cfg: AdminConfig, grant: Grant): string {
  const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
  const mac = createHmac("sha256", signingKey(cfg)).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function verify(cfg: AdminConfig, token: string | undefined): Grant | null {
  if (!token || !cfg.adminKey) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const expected = createHmac("sha256", signingKey(cfg)).update(payload).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const grant = JSON.parse(Buffer.from(payload, "base64url").toString()) as Grant;
    if (typeof grant.n !== "string" || typeof grant.exp !== "number" || grant.exp < Date.now() / 1000) return null;
    return grant;
  } catch {
    return null;
  }
}

export function adminKeyMatches(candidate: string): boolean {
  const cfg = getAdminConfig();
  if (!cfg.adminKey) return false;
  const a = createHmac("sha256", "okb-admin-compare").update(candidate).digest();
  const b = createHmac("sha256", "okb-admin-compare").update(cfg.adminKey).digest();
  return timingSafeEqual(a, b);
}

export function setAdminCookie(response: NextResponse, name: string): void {
  const cfg = getAdminConfig();
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  response.cookies.set(COOKIE, sign(cfg, { n: name, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export function clearAdminCookie(response: NextResponse): void {
  response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "strict" });
}

/** The signed-in admin's name, or null. */
export function adminName(request: NextRequest): string | null {
  return verify(getAdminConfig(), request.cookies.get(COOKIE)?.value)?.n ?? null;
}

/** Same-origin check for state-changing requests (defence in depth with SameSite=strict). */
export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  let sameOrigin = false;
  try {
    sameOrigin = Boolean(origin && host && new URL(origin).host === host);
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) throw new ApiError(403, "FORBIDDEN", "Cross-origin request rejected");
}

/** This site's origin as the browser sees it ("https://okb-ousc.site"). */
export function siteOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Resolves the signed-in admin, or throws 401 (403 when no admin key is configured). */
export function requireAdmin(request: NextRequest, opts: { mutating?: boolean } = {}): string {
  if (opts.mutating) assertSameOrigin(request);
  if (!getAdminConfig().adminKey) {
    throw new ApiError(403, "FORBIDDEN", "Admin access is not configured on the server. Set OKB_ADMIN_KEY.", {
      reason: "access_not_configured",
    });
  }
  const name = adminName(request);
  if (!name) {
    throw new ApiError(401, "UNAUTHORIZED", "Sign in to the Admin page.", { reason: "access_required" });
  }
  return name;
}
