import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/features/admin/server/session";
import { abortMedia, confirmMedia } from "@/features/flood-report/server/media";

export const dynamic = "force-dynamic";
// Joining the parts of a 1 GB video takes R2 a few seconds.
export const maxDuration = 60;

/**
 * Called after a direct browser upload finishes: joins the parts of a multipart upload (uploadId, partCount),
 * then checks the file reached storage. With `abort: true` it drops an unfinished multipart upload instead.
 */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  requireAdmin(request, { mutating: true });
  const body = z
    .object({
      key: z.string().max(300),
      uploadId: z.string().min(1).max(1024).optional(),
      partCount: z.number().int().positive().max(10_000).optional(),
      abort: z.boolean().optional(),
    })
    .parse(await request.json());
  const id = ((await params).id ?? "").toLowerCase();
  if (body.abort && body.uploadId) {
    await abortMedia(id, body.key, body.uploadId);
    return ok({ key: body.key, aborted: true });
  }
  await confirmMedia(id, body.key, body.uploadId, body.partCount);
  return ok({ key: body.key });
});
