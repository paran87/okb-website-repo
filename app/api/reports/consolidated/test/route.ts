import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { created } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { testSend } from "@/features/consolidated-reports/server/bridge";
import { MAX_TEST_PERIOD_DAYS } from "@/features/consolidated-reports/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PERIOD_MS = MAX_TEST_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/** Optional reporting period (ISO, UTC); without it the backend uses the last 24 hours. */
const periodSchema = z
  .object({
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
  })
  .refine((p) => p.periodEnd === undefined || p.periodStart !== undefined, {
    message: "Choose the start of the reporting period",
    path: ["periodStart"],
  })
  .refine((p) => !p.periodStart || !p.periodEnd || Date.parse(p.periodStart) < Date.parse(p.periodEnd), {
    message: "The reporting period must start before it ends",
    path: ["periodEnd"],
  })
  .refine((p) => !p.periodStart || !p.periodEnd || Date.parse(p.periodEnd) - Date.parse(p.periodStart) <= MAX_PERIOD_MS, {
    message: `The reporting period can be at most ${MAX_TEST_PERIOD_DAYS} days`,
    path: ["periodEnd"],
  });

/**
 * Test Send: the backend builds a TEST REPORT from the reports in the chosen period (it does not consume them
 * or move the regular reporting period). The bridge phone sends its TEXT automatically to the destination group at its next check;
 * the PDF waits on the phone for the operator ("Send as PDF").
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const { operatorName } = await requireReportsAccess(request, { mutating: true });
  const { periodStart, periodEnd } = periodSchema.parse(await request.json().catch(() => ({})));
  return created(await testSend(operatorName, { periodStart, periodEnd }));
});
