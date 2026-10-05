import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getAnalytics } from "@/features/reports/server/service";

export const dynamic = "force-dynamic";

/** Report analytics, aggregated on the server (only aggregates reach the browser). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request);
  return ok(await getAnalytics(store), { meta: { dataSource: store.kind } });
});
