import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import {
  getCollectorStatus,
  setPaused,
} from "@/features/media-collector/server/bridge";
import { fixtureStatus } from "@/features/media-collector/server/fixtures";
import { requireReportsAccess } from "@/features/reports/server/access";

export const dynamic = "force-dynamic";

/** OKB Media Collector status (last heartbeat of each collector) and pause flags. No credentials are returned. */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request, { area: "settings" });
  return ok(
    store.kind === "fixtures" ? fixtureStatus() : await getCollectorStatus(),
  );
});

/** Pause or resume a platform. Pausing can only STOP collection; allowlists are configured on the collector. */
const pauseSchema = z
  .object({
    whatsappPaused: z.boolean().optional(),
    viberPaused: z.boolean().optional(),
  })
  .refine(
    (v) => v.whatsappPaused !== undefined || v.viberPaused !== undefined,
    "Nothing to change",
  );

export const PUT = withApiHandler(async (request: NextRequest) => {
  const { store, operatorName } = await requireReportsAccess(request, {
    mutating: true,
    area: "settings",
  });
  const patch = pauseSchema.parse(await request.json());
  if (store.kind === "fixtures")
    return ok({
      ...fixtureStatus().settings,
      ...patch,
      updatedBy: operatorName,
    });
  return ok(await setPaused(patch, operatorName));
});
