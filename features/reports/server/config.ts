import "server-only";

/**
 * Server-only configuration for the Reports module.
 *
 * Reads the OKB Bridge Supabase project (where the bridge backend stores
 * WhatsApp/Viber reports) with its service-role key, and writes reviews
 * through the bridge's own REST API so the backend stays the only writer of
 * report records. None of these values are ever sent to the browser.
 */
export interface ReportsConfig {
  supabaseUrl: string | null;
  supabaseServiceKey: string | null;
  bridgeApiUrl: string | null;
  bridgeAdminToken: string | null;
  accessKey: string | null;
  authSecret: string;
  /** Development-only fixtures (never in production builds). */
  fixtures: boolean;
}

function env(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : null;
}

export function getReportsConfig(): ReportsConfig {
  return {
    supabaseUrl: env("OKB_BRIDGE_SUPABASE_URL")?.replace(/\/+$/, "") ?? null,
    supabaseServiceKey: env("OKB_BRIDGE_SUPABASE_SERVICE_ROLE_KEY"),
    bridgeApiUrl: env("OKB_BRIDGE_API_URL")?.replace(/\/+$/, "") ?? null,
    bridgeAdminToken: env("OKB_BRIDGE_ADMIN_TOKEN"),
    accessKey: env("OKB_REPORTS_ACCESS_KEY"),
    authSecret: env("AUTH_SECRET") ?? "",
    fixtures: process.env.NODE_ENV !== "production" && env("OKB_REPORTS_DEV_FIXTURES") === "1",
  };
}
