import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { invalidatePublicReports } from "@/features/flood-report/server/service";
import { getReportStore } from "@/features/reports/server/index";
import { invalidateAggregates } from "@/features/reports/server/service";

export const dynamic = "force-dynamic";
// A WhatsApp / Viber review goes through the OKB Bridge, which may need to wake up.
export const maxDuration = 60;

const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "reopen"]),
  notes: z.string().trim().max(1000).optional().nullable(),
});

/**
 * Admin → Reports: approve, reject or reopen any report (OKB Mobile in Supabase, WhatsApp / Viber through the
 * OKB Bridge), as Incoming Reports does. The reviewer is the signed-in admin.
 */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  const admin = requireAdmin(request, { mutating: true });
  const store = getReportStore();
  if (!store) throw new ApiError(503, "INTERNAL_ERROR", "Report storage is not configured on the server.");
  const id = ((await params).id ?? "").toLowerCase();
  const body = reviewSchema.parse(await request.json());
  const before = await store.getReport(id);
  if (!before) throw new NotFoundError("This report no longer exists.");
  await store.review(id, body.action, `admin ${admin}`.slice(0, 100), body.notes || null);
  invalidateAggregates();
  invalidatePublicReports();
  // The status the review leads to (the OKB Bridge may write its copy a moment later).
  return ok({ id, status: body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "needs_review" });
});
