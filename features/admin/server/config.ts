import "server-only";

/**
 * Server-only configuration for the Admin page (/admin).
 *
 * - Sign-in: OKB_ADMIN_KEY. Until it is set, the operator access key
 *   (OKB_REPORTS_ACCESS_KEY) also opens the Admin page, and the page asks for a
 *   dedicated key.
 * - Data: the OKB Bridge Supabase project (visits and media captions, see
 *   supabase/migrations/20261014000000_okb_site_admin.sql) and the operations R2
 *   bucket (photos and videos).
 */
export interface AdminConfig {
  adminKey: string | null;
  usingFallbackKey: boolean;
  authSecret: string;
  supabaseUrl: string | null;
  supabaseServiceKey: string | null;
}

function env(value: string | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

export function getAdminConfig(): AdminConfig {
  const dedicated = env(process.env.OKB_ADMIN_KEY);
  const fallback = env(process.env.OKB_REPORTS_ACCESS_KEY);
  return {
    adminKey: dedicated ?? fallback,
    usingFallbackKey: !dedicated && Boolean(fallback),
    authSecret: env(process.env.AUTH_SECRET) ?? "",
    supabaseUrl: env(process.env.OKB_BRIDGE_SUPABASE_URL)?.replace(/\/+$/, "") ?? null,
    supabaseServiceKey: env(process.env.OKB_BRIDGE_SUPABASE_SERVICE_ROLE_KEY),
  };
}
