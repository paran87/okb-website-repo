import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireReportsAccess } from "@/features/reports/server/access";
import { deleteSchedule, updateSchedule } from "@/features/consolidated-reports/server/bridge";
import { scheduleSchema } from "../schema";

export const dynamic = "force-dynamic";

/** Edits an entry that is still waiting for its date of sending. */
export const PATCH = withApiHandler(async (request: NextRequest, { params }) => {
  await requireReportsAccess(request, { mutating: true, area: "settings" });
  return ok(await updateSchedule((await params).scheduleId ?? "", scheduleSchema.parse(await request.json())));
});

/** Removes an entry; a prepared report not yet sent is cancelled first. */
export const DELETE = withApiHandler(async (request: NextRequest, { params }) => {
  await requireReportsAccess(request, { mutating: true, area: "settings" });
  return ok(await deleteSchedule((await params).scheduleId ?? ""));
});
