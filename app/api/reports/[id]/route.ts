import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getReportDetail } from "@/features/reports/server/service";
import { deleteReportAsOperator } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";

/** Full report: original message, AI output, comparison, incidents, audit trail. */
export const GET = withApiHandler(async (request: NextRequest, { params }) => {
  const { store } = await requireReportsAccess(request);
  const id = (await params).id ?? "";
  return ok(await getReportDetail(store, id), { meta: { dataSource: store.kind } });
});

/** An operator deletes a report sent from the OKB mobile page, with its photos (other reports: 404). */
export const DELETE = withApiHandler(async (request: NextRequest, { params }) => {
  const { operatorName } = await requireReportsAccess(request, { mutating: true });
  await deleteReportAsOperator((await params).id ?? "", operatorName);
  return ok({ deleted: true });
});
