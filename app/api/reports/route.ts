import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { listReports, resolveListQuery } from "@/features/reports/server/service";

export const dynamic = "force-dynamic";

/** Paginated, server-side filtered and searched report list. */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request);
  const query = resolveListQuery(request.nextUrl.searchParams);
  const result = await listReports(store, query);
  return ok(result, { meta: { dataSource: store.kind } });
});
