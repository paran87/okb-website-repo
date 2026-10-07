import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { getSettings, saveSettings } from "@/features/consolidated-reports/server/bridge";

export const dynamic = "force-dynamic";

/** The report schedule replaces the fixed daily times (see ./schedules); the destination is set on the phone. */
const settingsSchema = z.object({
  enabled: z.boolean(),
  sendOnlyIfReports: z.boolean(),
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
