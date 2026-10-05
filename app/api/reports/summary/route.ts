import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getSituationSummary } from "@/features/reports/server/service";

export const dynamic = "force-dynamic";

const WINDOWS = new Set([6, 24, 72, 168]);

/** Situation view: status totals, sources, regions and monitoring-series changes. */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request);
  const hours = Number(request.nextUrl.searchParams.get("hours") ?? 24);
  return ok(await getSituationSummary(store, WINDOWS.has(hours) ? hours : 24), { meta: { dataSource: store.kind } });
});
