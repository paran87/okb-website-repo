import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getFloodMap } from "@/features/incident/server/flood-map";

export const dynamic = "force-dynamic";

/** Flooded locations from the received reports and the weather that decides when they clear (Incidents map). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request);
  return ok(await getFloodMap(store), { meta: { dataSource: store.kind } });
});
