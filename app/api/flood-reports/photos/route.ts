import type { NextRequest } from "next/server";
import { BadRequestError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { created } from "@/lib/api/response";
import { MAX_PHOTO_BYTES } from "@/features/flood-report/lib/options";
import { rateLimit } from "@/features/flood-report/server/rate-limit";
import { uploadPhoto } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** One geotagged JPEG for a mobile flood report (multipart: `reportId`, `photo`). Returns its R2 key. */
export const POST = withApiHandler(async (request: NextRequest) => {
  rateLimit(request, "flood-photo", 150, 10 * 60_000);
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_PHOTO_BYTES + 64_000) throw new BadRequestError("The photo is too large.");
  const form = await request.formData();
  const reportId = form.get("reportId");
  const photo = form.get("photo");
  if (typeof reportId !== "string" || !(photo instanceof Blob)) throw new BadRequestError("Send reportId and photo.");
  const key = await uploadPhoto(reportId, await photo.arrayBuffer());
  return created({ key });
});
