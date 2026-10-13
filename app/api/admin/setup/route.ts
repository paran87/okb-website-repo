import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { supabaseProjectRef } from "@/features/admin/server/supabase";

export const dynamic = "force-dynamic";

/** Bundled with this route (next.config.ts → outputFileTracingIncludes). */
const SETUP_SQL_FILE = "supabase/migrations/20261014000000_okb_site_admin.sql";

/** The one-time SQL that creates the Admin tables, and the Supabase SQL editor link. */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const sql = await readFile(path.join(process.cwd(), SETUP_SQL_FILE), "utf8");
  const ref = supabaseProjectRef();
  return ok({ sql, sqlEditorUrl: ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null });
});
