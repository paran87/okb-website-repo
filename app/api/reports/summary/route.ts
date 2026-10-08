import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ValidationError } from "@/lib/api/errors";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getSituationSummary } from "@/features/reports/server/service";
import { isMonitoringPeriod, monitoringPeriodRange } from "@/features/reports/lib/monitoring-period";

export const dynamic = "force-dynamic";

const WINDOWS = new Set([6, 24, 72, 168]);

/** Situation view: status totals, sources, regions and monitoring-series changes (last N hours, or a monitoring period). */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request);
  const sp = request.nextUrl.searchParams;
  const day = sp.get("day");
  const period = sp.get("period");
  if (day || period) {
    const range = day && isMonitoringPeriod(period) ? monitoringPeriodRange(day, period) : null;
    if (!range || !day || !isMonitoringPeriod(period)) throw new ValidationError("A monitoring period needs a day (YYYY-MM-DD) and a period");
    return ok(await getSituationSummary(store, { day, period, ...range }), { meta: { dataSource: store.kind } });
  }
  const hours = Number(sp.get("hours") ?? 24);
  return ok(await getSituationSummary(store, { hours: WINDOWS.has(hours) ? hours : 24 }), { meta: { dataSource: store.kind } });
});
