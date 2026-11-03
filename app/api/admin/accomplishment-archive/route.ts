import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { supabaseProjectRef } from "@/features/admin/server/supabase";
import { archiveStatus, takeArchiveSnapshot } from "@/features/accomplishment/server/archive";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Bundled with this route (next.config.ts → outputFileTracingIncludes). */
const SQL_FILE = "supabase/migrations/20261103000000_okb_accomplishment_archive.sql";

/** Admin → Setup: the archive's state, and its SQL until the tables exist. */
export const GET = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request);
  const status = await archiveStatus();
  const ref = supabaseProjectRef();
  const sql = status.ready ? null : await readFile(path.join(process.cwd(), SQL_FILE), "utf8");
  return ok({ ...status, sql, sqlEditorUrl: ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : null });
});

/** Take a snapshot now (the daily cron job does the same). */
export const POST = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request, { mutating: true });
  return ok(await takeArchiveSnapshot());
});
