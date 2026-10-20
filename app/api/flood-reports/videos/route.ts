import type { NextRequest } from "next/server";
import { z } from "zod";
import { BadRequestError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/response";
import { ensureDirectUploads } from "@/features/admin/server/media";
import { siteOrigin } from "@/features/admin/server/session";
import { rateLimit } from "@/features/flood-report/server/rate-limit";
import { createVideoTicket, proxyVideoUpload, VIDEO_PROXY_LIMIT } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ticketSchema = z.object({
  reportId: z.string().max(64),
  size: z.number().int().positive(),
  contentType: z.string().max(100),
});

/**
 * A signed link the OKB Mobile page uploads its video to, straight to R2 (up to 50 MB; too large for this
 * site's requests). The bucket is set to allow this site first.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  rateLimit(request, "flood-video", 20, 10 * 60_000);
  const body = ticketSchema.parse(await request.json());
  return created(await createVideoTicket(body.reportId, body.size, body.contentType, () => ensureDirectUploads(siteOrigin(request))));
});

/** Fallback for a small video when the phone cannot reach R2 directly (?reportId&key, raw body). */
export const PUT = withApiHandler(async (request: NextRequest) => {
  rateLimit(request, "flood-video", 20, 10 * 60_000);
  if (Number(request.headers.get("content-length") ?? 0) > VIDEO_PROXY_LIMIT) throw new BadRequestError("The video is too large for this upload path.");
  const params = request.nextUrl.searchParams;
  const key = params.get("key") ?? "";
  await proxyVideoUpload(params.get("reportId") ?? "", key, await request.arrayBuffer());
  return ok({ key });
});
