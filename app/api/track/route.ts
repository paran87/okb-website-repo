import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { SiteDbMissingError, siteDbConfigured } from "@/features/admin/server/supabase";
import { isBot, parseAgent } from "@/features/admin/server/user-agent";
import { recordVisit } from "@/features/admin/server/visits";

export const dynamic = "force-dynamic";

/**
 * Page-view beacon from components/analytics/visit-tracker.tsx.
 *
 * Stores no IP address: a visitor is a random id in a first-party cookie, a
 * session ends after 30 minutes without a page view, and the location is the
 * city/country Vercel derives for the request. Failures are swallowed — the
 * tracker never affects the page.
 */

const VISITOR_COOKIE = "okb_vid";
const SESSION_COOKIE = "okb_sid";
const VISITOR_MAX_AGE_S = 400 * 24 * 60 * 60;
const SESSION_MAX_AGE_S = 30 * 60;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const log = logger.child({ module: "track" });

/** Until the Admin tables exist, stop trying for a while instead of failing on every page view. */
const MISSING_BACKOFF_MS = 5 * 60 * 1000;
let skipUntil = 0;

/** Page views come from this site's own pages (browsers send Origin on POST). */
function fromThisSite(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const bodySchema = z.object({
  path: z.string().min(1).max(512).startsWith("/"),
  title: z.string().max(300).optional(),
  referrer: z.string().max(1024).optional(),
  screen: z.string().max(20).optional(),
  language: z.string().max(35).optional(),
});

function header(request: NextRequest, name: string): string | null {
  const raw = request.headers.get(name);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).slice(0, 120);
  } catch {
    return raw.slice(0, 120);
  }
}

/** ISO 3166-2:PH region codes (what Vercel sends) → names. */
const PH_REGIONS: Record<string, string> = {
  "00": "Metro Manila",
  "01": "Ilocos",
  "02": "Cagayan Valley",
  "03": "Central Luzon",
  "05": "Bicol",
  "06": "Western Visayas",
  "07": "Central Visayas",
  "08": "Eastern Visayas",
  "09": "Zamboanga Peninsula",
  "10": "Northern Mindanao",
  "11": "Davao Region",
  "12": "Soccsksargen",
  "13": "Caraga",
  "14": "BARMM",
  "15": "Cordillera",
  "40": "Calabarzon",
  "41": "Mimaropa",
};

function regionName(country: string | null, code: string | null): string | null {
  if (!code) return null;
  if (country === "PH") return PH_REGIONS[code] ?? null;
  return /^\d+$/.test(code) ? null : code;
}

function externalReferrer(referrer: string | undefined, host: string | null): { url: string; host: string } | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (!/^https?:$/.test(url.protocol) || (host && url.host === host)) return null;
    return { url: `${url.origin}${url.pathname}`.slice(0, 1024), host: url.hostname.replace(/^www\./, "").slice(0, 255) };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const done = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  const ua = request.headers.get("user-agent") ?? "";
  if (!siteDbConfigured() || isBot(ua) || Date.now() < skipUntil || !fromThisSite(request)) return done;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return done;
  const body = parsed.data;
  const path = body.path.split(/[?#]/)[0] || "/";
  if (path.startsWith("/admin") || path.startsWith("/api")) return done;

  const storedVisitor = request.cookies.get(VISITOR_COOKIE)?.value;
  const storedSession = request.cookies.get(SESSION_COOKIE)?.value;
  const isNewVisitor = !storedVisitor || !UUID.test(storedVisitor);
  const newSession = !storedSession || !UUID.test(storedSession);
  const visitorId = isNewVisitor ? randomUUID() : storedVisitor;
  const sessionId = newSession ? randomUUID() : storedSession;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  // Only the first page of a session says where the visitor came from.
  const ref = newSession ? externalReferrer(body.referrer, host) : null;
  const agent = parseAgent(ua);
  const country = header(request, "x-vercel-ip-country")?.slice(0, 8) ?? null;

  try {
    await recordVisit({
      visitor_id: visitorId,
      session_id: sessionId,
      is_new_visitor: isNewVisitor,
      area: path === "/command" || path.startsWith("/command/") ? "command" : "website",
      path,
      page_title: body.title?.trim().slice(0, 300) || null,
      referrer: ref?.url ?? null,
      referrer_host: ref?.host ?? null,
      country,
      region: regionName(country, header(request, "x-vercel-ip-country-region")),
      city: header(request, "x-vercel-ip-city"),
      device: agent.device,
      browser: agent.browser,
      os: agent.os,
      screen: body.screen ?? null,
      language: body.language ?? null,
    });
  } catch (err) {
    if (err instanceof SiteDbMissingError) {
      skipUntil = Date.now() + MISSING_BACKOFF_MS;
      return done;
    }
    log.warn({ err: err instanceof Error ? err.message : String(err) }, "visit not recorded");
    return done;
  }

  const secure = process.env.NODE_ENV === "production";
  done.cookies.set(VISITOR_COOKIE, visitorId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: VISITOR_MAX_AGE_S,
  });
  done.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  return done;
}
