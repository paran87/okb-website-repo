import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getSettings, saveSettings } from "@/features/consolidated-reports/server/bridge";
import { SCHEDULE_TIMES } from "@/features/consolidated-reports/types";

export const dynamic = "force-dynamic";

const settingsSchema = z
  .object({
    enabled: z.boolean(),
    scheduleTimes: z.array(z.enum(SCHEDULE_TIMES)).max(SCHEDULE_TIMES.length),
    intervalMinutes: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(120), z.null()]),
    sendOnlyIfReports: z.boolean(),
    destinationGroup: z.string().trim().max(100),
  })
  // A blank destination is allowed when the bridge phone has one configured; the backend checks that.
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
