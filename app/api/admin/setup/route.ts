import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { supabaseProjectRef } from "@/features/admin/server/supabase";

export const dynamic = "force-dynamic";

/** Bundled with this route (next.config.ts → outputFileTracingIncludes). */
const SETUP_SQL_FILES = [
  "supabase/migrations/20261014000000_okb_site_admin.sql",
  "supabase/migrations/20261016000000_okb_gallery_engagement.sql",
  "supabase/migrations/20261020000000_okb_site_feedback.sql",
];

/** The one-time SQL that creates the Admin tables, and the Supabase SQL editor link. */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const sql = (await Promise.all(SETUP_SQL_FILES.map((f) => readFile(path.join(process.cwd(), f), "utf8")))).join("\n\n");
  const ref = supabaseProjectRef();
  return ok({ sql, sqlEditorUrl: ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null });
});
