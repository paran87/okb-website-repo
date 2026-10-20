import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { deleteReportAsOperator, updateReportAsOperator } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";
// Room for the AI photo check when photos taken far apart may show a flooded stretch.
export const maxDuration = 60;

/** An operator corrects a mobile report: the full form and photo list (photos left out are deleted). */
export const PATCH = withApiHandler(async (request: NextRequest, { params }) => {
  const operator = requireAdmin(request, { mutating: true });
  return ok(await updateReportAsOperator((await params).id ?? "", operator, await request.json()));
});

/** An operator deletes a mobile report and its photos. */
export const DELETE = withApiHandler(async (request: NextRequest, { params }) => {
  const operator = requireAdmin(request, { mutating: true });
  await deleteReportAsOperator((await params).id ?? "", operator);
  return ok({ deleted: true });
});
