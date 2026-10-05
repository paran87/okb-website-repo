import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getReportDetail } from "@/features/reports/server/service";

export const dynamic = "force-dynamic";

/** Full report: original message, AI output, comparison, incidents, audit trail. */
export const GET = withApiHandler(async (request: NextRequest, { params }) => {
  const { store } = await requireReportsAccess(request);
  const id = (await params).id ?? "";
  return ok(await getReportDetail(store, id), { meta: { dataSource: store.kind } });
});
