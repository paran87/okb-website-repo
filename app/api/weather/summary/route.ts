import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getPagasaNcrSummary } from "@/features/weather/services/pagasa.service";

export const dynamic = "force-dynamic";

/** Compact Metro Manila weather snapshot from PAGASA. */
export const GET = withApiHandler(async () => {
  const summary = await getPagasaNcrSummary();
  return ok(summary);
});
