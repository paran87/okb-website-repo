import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getSettings, saveSettings } from "@/features/consolidated-reports/server/bridge";
import { MAX_SCHEDULE_TIMES, SCHEDULE_TIME_PATTERN } from "@/features/consolidated-reports/types";

export const dynamic = "force-dynamic";

const settingsSchema = z
  .object({
    enabled: z.boolean(),
    scheduleTimes: z
      .array(z.string().regex(SCHEDULE_TIME_PATTERN, "Times must be HH:MM (24-hour)"))
      .transform((times) => [...new Set(times)].sort())
      .pipe(z.array(z.string()).max(MAX_SCHEDULE_TIMES, `At most ${MAX_SCHEDULE_TIMES} schedule times`)),
    intervalMinutes: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(120), z.null()]),
    sendOnlyIfReports: z.boolean(),
  })
  // The destination group is set on the bridge phone, not here; the backend refuses enabling until it is.
  .refine((s) => !s.enabled || s.scheduleTimes.length > 0 || s.intervalMinutes !== null, {
    message: "Choose at least one schedule time or an interval",
    path: ["scheduleTimes"],
  });

export const GET = withApiHandler(async (request: NextRequest) => {
  await requireReportsAccess(request);
  return ok(await getSettings());
});

export const PUT = withApiHandler(async (request: NextRequest) => {
  const { operatorName } = await requireReportsAccess(request, { mutating: true });
  const settings = settingsSchema.parse(await request.json());
  return ok(await saveSettings(settings, operatorName));
});
