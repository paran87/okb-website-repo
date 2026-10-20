import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { rateLimit } from "@/features/flood-report/server/rate-limit";
import { deleteMyReport, updateMyReport } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";

/** The sender edits their report: the full form, the photo list and the edit key ({ token, … }). */
export const PATCH = withApiHandler(async (request: NextRequest, { params }) => {
  rateLimit(request, "flood-report-edit", 60, 10 * 60_000);
  return ok(await updateMyReport((await params).id ?? "", await request.json()));
});

/** The sender deletes their report and its photos ({ token }). */
export const DELETE = withApiHandler(async (request: NextRequest, { params }) => {
  rateLimit(request, "flood-report-edit", 60, 10 * 60_000);
  await deleteMyReport((await params).id ?? "", await request.json().catch(() => null));
  return ok({ deleted: true });
});
