import "server-only";
import { ApiError } from "@/lib/api/errors";
import { getAdminConfig } from "@/features/admin/server/config";

/**
 * Supabase REST (PostgREST) calls for the Admin tables, with the service-role
 * key — server-side only.
 */

/** The Admin tables or the stats function have not been created yet (run the setup SQL). */
export class SiteDbMissingError extends ApiError {
  constructor() {
    super(503, "INTERNAL_ERROR", "The Admin tables are not set up in Supabase yet. Open Admin → Setup and run the SQL.", {
      reason: "db_not_ready",
    });
  }
}

export class SiteDbNotConfiguredError extends ApiError {
  constructor() {
    super(
      503,
      "INTERNAL_ERROR",
      "Supabase is not connected. Set OKB_BRIDGE_SUPABASE_URL and OKB_BRIDGE_SUPABASE_SERVICE_ROLE_KEY on the server.",
      { reason: "db_not_configured" },
    );
  }
}

export function siteDbConfigured(): boolean {
  const cfg = getAdminConfig();
  return Boolean(cfg.supabaseUrl && cfg.supabaseServiceKey);
}

/** Supabase project ref (for the SQL editor link). */
export function supabaseProjectRef(): string | null {
  const url = getAdminConfig().supabaseUrl;
  if (!url) return null;
  try {
    const host = new URL(url).hostname;
    return host.endsWith(".supabase.co") ? (host.split(".")[0] ?? null) : null;
  } catch {
    return null;
  }
}

interface RestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  prefer?: string[];
  timeoutMs?: number;
}

export interface RestResult<T> {
  data: T;
  total: number | null;
}

function parseTotal(contentRange: string | null): number | null {
  const total = contentRange?.split("/")[1];
  return total && total !== "*" ? Number(total) : null;
}

/** `path` is relative to /rest/v1/, e.g. `okb_site_visits?select=id`. */
export async function siteRest<T = unknown>(path: string, opts: RestOptions = {}): Promise<RestResult<T>> {
  const cfg = getAdminConfig();
  if (!cfg.supabaseUrl || !cfg.supabaseServiceKey) throw new SiteDbNotConfiguredError();
  let res: Response;
  try {
    res = await fetch(`${cfg.supabaseUrl}/rest/v1/${path}`, {
      method: opts.method ?? "GET",
      headers: {
        apikey: cfg.supabaseServiceKey,
        Authorization: `Bearer ${cfg.supabaseServiceKey}`,
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(opts.prefer?.length ? { Prefer: opts.prefer.join(",") } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
    });
  } catch {
    throw new ApiError(502, "INTERNAL_ERROR", "Supabase could not be reached.", { reason: "db_unreachable" });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // PGRST205: table not in the schema cache; PGRST202: function not found; 42P01: undefined table.
    if (/PGRST205|PGRST202|42P01|42883/.test(text)) throw new SiteDbMissingError();
    throw new ApiError(502, "INTERNAL_ERROR", `Supabase request failed (${res.status}).`, { reason: "db_error" });
  }
  const raw = res.status === 204 ? "" : await res.text();
  return { data: (raw ? JSON.parse(raw) : null) as T, total: parseTotal(res.headers.get("content-range")) };
}

/** True when the Admin tables and stats function exist. */
export async function siteDbReady(): Promise<boolean> {
  if (!siteDbConfigured()) return false;
  try {
    await siteRest("okb_site_visits?select=id&limit=1");
    await siteRest("okb_site_media?select=key&limit=1");
    await siteRest("rpc/okb_site_visit_stats", {
      method: "POST",
      body: { p_from: new Date().toISOString(), p_to: new Date().toISOString() },
    });
    return true;
  } catch {
    return false;
  }
}
