import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { fixtureMedia } from "@/features/media-collector/server/fixtures";
import { listCollectedMedia } from "@/features/media-collector/server/store";
import { requireReportsAccess } from "@/features/reports/server/access";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  source: z.enum(["whatsapp", "viber"]).optional(),
  kind: z.enum(["image", "video", "document"]).optional(),
  status: z
    .enum([
      "stored",
      "duplicate",
      "media_unavailable",
      "rejected",
      "not_collected",
    ])
    .optional(),
  group: z.string().trim().min(1).max(200).optional(),
  sender: z.string().trim().min(1).max(100).optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  offset: z.coerce.number().int().min(0).max(100_000).optional(),
});

/**
 * Media collected by the OKB Media Collector (authorized channels only — the collector never stores anything
 * else). Contains photos and sender names, so it needs the operator access key like Settings.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  const { store } = await requireReportsAccess(request, { area: "settings" });
  const query = querySchema.parse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const result =
    store.kind === "fixtures"
      ? fixtureMedia(query)
      : await listCollectedMedia(query);
  const response = ok(result, { meta: { dataSource: store.kind } });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
});
