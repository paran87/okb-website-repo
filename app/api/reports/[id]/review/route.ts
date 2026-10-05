import type { NextRequest } from "next/server";
import { z } from "zod";
import { NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getReportDetail, invalidateAggregates } from "@/features/reports/server/service";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject", "reopen"]),
  notes: z.string().trim().max(1000).optional().nullable(),
});

/**
 * Operator review. Sent to the OKB Bridge backend's review endpoint so the
 * backend remains the only writer of report records; the reviewer is the
 * signed-in operator (never taken from the request body).
 */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  const { store, operatorName } = await requireReportsAccess(request, { mutating: true });
  const id = (await params).id ?? "";
  const body = reviewSchema.parse(await request.json());
  if (!(await store.getReport(id))) throw new NotFoundError("Report not found");
  await store.review(id, body.action, operatorName, body.notes || null);
  invalidateAggregates();
  return ok(await getReportDetail(store, id));
});
