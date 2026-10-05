import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { ApiError, ForbiddenError } from "@/lib/api/errors";
import { getCurrentUser } from "@/lib/auth/guards";
import { hasPermission, Permission } from "@/lib/rbac/permissions";
import type { ReportsAccessState } from "@/features/reports/types";
import { getReportsConfig, type ReportsConfig } from "@/features/reports/server/config";
import { getReportStore } from "@/features/reports/server/index";
import type { ReportStore } from "@/features/reports/server/store";

/**
 * Operator access for the Reports module.
 *
 * Reports contain WhatsApp/Viber message content, group names and sender
 * names. The Command Center has no login flow yet (Auth.js has no providers),
 * so access is granted by either:
 *
 *  1. an Auth.js session whose role has `report:view` (works automatically
 *     once a login provider is added), or
 *  2. a signed, httpOnly operator cookie issued after entering the shared
 *     OKB_REPORTS_ACCESS_KEY and the operator's name.
 *
 * Access fails closed: with neither configured, report data is not served.
 */

const COOKIE = "okb_reports_access";
const MAX_AGE_S = 12 * 60 * 60;

interface Grant {
  n: string;
  exp: number;
}

function signingKey(cfg: ReportsConfig): string {
  // Rotating the access key invalidates every issued cookie.
  return `${cfg.authSecret}::okb-reports::${cfg.accessKey ?? ""}`;
}

function sign(cfg: ReportsConfig, grant: Grant): string {
  const payload = Buffer.from(JSON.stringify(grant)).toString("base64url");
  const mac = createHmac("sha256", signingKey(cfg)).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

function verify(cfg: ReportsConfig, token: string | undefined): Grant | null {
  if (!token || !cfg.accessKey) return null;
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

export function keyMatches(cfg: ReportsConfig, candidate: string): boolean {
  if (!cfg.accessKey) return false;
  const a = createHmac("sha256", "okb-key-compare").update(candidate).digest();
  const b = createHmac("sha256", "okb-key-compare").update(cfg.accessKey).digest();
  return timingSafeEqual(a, b);
}

export function setAccessCookie(response: NextResponse, operatorName: string): void {
  const cfg = getReportsConfig();
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_S;
  response.cookies.set(COOKIE, sign(cfg, { n: operatorName, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export function clearAccessCookie(response: NextResponse): void {
  response.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "strict" });
}

async function sessionOperator(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    if (user && hasPermission(user.role, Permission.REPORT_VIEW)) return user.name || user.email || user.id;
  } catch {
    /* no auth configured */
  }
  return null;
}

/** Public, data-free description of the access state (for the gate UI). */
export async function getAccessState(request: NextRequest): Promise<ReportsAccessState> {
  const cfg = getReportsConfig();
  const store = getReportStore();
  const dataSource = store ? store.kind : "not_configured";
  const session = await sessionOperator();
  const grant = verify(cfg, request.cookies.get(COOKIE)?.value);
  const devOpen = store?.kind === "fixtures" && !cfg.accessKey;
  return {
    dataSource,
    accessConfigured: Boolean(cfg.accessKey) || devOpen,
    granted: Boolean(session || grant || devOpen),
    operatorName: session ?? grant?.n ?? (devOpen ? "Developer (fixtures)" : null),
    reviewEnabled: Boolean(store?.reviewEnabled),
  };
}

export interface ReportsContext {
  store: ReportStore;
  operatorName: string;
}

/** Same-origin check for state-changing requests (defence in depth with SameSite=strict). */
export function assertSameOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) throw new ForbiddenError("Cross-origin request rejected");
  try {
    if (new URL(origin).host !== host) throw new ForbiddenError("Cross-origin request rejected");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ForbiddenError("Cross-origin request rejected");
  }
}

/** Resolves the store and operator, or throws a typed 401/403/503. */
export async function requireReportsAccess(
  request: NextRequest,
  opts: { mutating?: boolean } = {},
): Promise<ReportsContext> {
  if (opts.mutating) assertSameOrigin(request);
  const store = getReportStore();
  if (!store) {
    throw new ApiError(
      503,
      "INTERNAL_ERROR",
      "The reports backend is not connected. Set OKB_BRIDGE_SUPABASE_URL and OKB_BRIDGE_SUPABASE_SERVICE_ROLE_KEY on the server.",
      { reason: "not_configured" },
    );
  }
  const state = await getAccessState(request);
  if (!state.granted || !state.operatorName) {
    if (!state.accessConfigured) {
      throw new ApiError(403, "FORBIDDEN", "Operator access to reports is not configured on the server.", {
        reason: "access_not_configured",
      });
    }
    throw new ApiError(401, "UNAUTHORIZED", "Operator access is required to view reports.", {
      reason: "access_required",
    });
  }
  return { store, operatorName: state.operatorName };
}
