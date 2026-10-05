import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getFacets } from "@/features/reports/server/service";

export const dynamic = "force-dynamic";

/** Filter values discovered from recent reports (groups, regions, offices…). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request);
  return ok(await getFacets(store), { meta: { dataSource: store.kind } });
});
