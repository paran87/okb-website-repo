import "server-only";
import { getReportsConfig } from "@/features/reports/server/config";
import { createFixtureStore } from "@/features/reports/server/fixture-store";
import type { ReportStore } from "@/features/reports/server/store";
import { createSupabaseStore } from "@/features/reports/server/supabase-store";

/**
 * Resolves the report data source. Live Supabase data always wins; the
 * fixture store exists only in non-production builds with
 * OKB_REPORTS_DEV_FIXTURES=1 and is never mixed with live data.
 */
export function getReportStore(): ReportStore | null {
  const cfg = getReportsConfig();
  if (cfg.supabaseUrl && cfg.supabaseServiceKey) return createSupabaseStore(cfg);
  if (cfg.fixtures) return createFixtureStore();
  return null;
}
