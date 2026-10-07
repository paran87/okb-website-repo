import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { createSchedule, listSchedules } from "@/features/consolidated-reports/server/bridge";
import { scheduleSchema } from "./schema";

export const dynamic = "force-dynamic";

/** The report schedule: monitoring period + date of sending, as many entries as needed. */
export const GET = withApiHandler(async (request: NextRequest) => {
  await requireReportsAccess(request);
  return ok(await listSchedules());
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { operatorName } = await requireReportsAccess(request, { mutating: true });
  return created(await createSchedule(scheduleSchema.parse(await request.json()), operatorName));
});
