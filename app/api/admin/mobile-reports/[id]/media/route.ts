import type { NextRequest } from "next/server";
import { z } from "zod";
import { BadRequestError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { ensureDirectUploads } from "@/features/admin/server/media";
import { requireAdmin, siteOrigin } from "@/features/admin/server/session";
import { createMediaTicket, deleteMedia, MEDIA_PROXY_LIMIT, proxyMediaUpload } from "@/features/flood-report/server/media";
import { assertReportExists } from "@/features/flood-report/server/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ticketSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().max(100).default(""),
  size: z.number().int().positive(),
});

/** A signed link the browser uploads one photo or video for the report to (straight to R2). */
export const POST = withApiHandler(async (request: NextRequest, { params }) => {
  requireAdmin(request, { mutating: true });
  const id = await assertReportExists((await params).id ?? "");
  const body = ticketSchema.parse(await request.json());
  // Large files go straight to R2, which must allow this site (set up here, no switch to turn on).
  await ensureDirectUploads(siteOrigin(request));
  return ok(await createMediaTicket(id, body.fileName, body.contentType, body.size));
});

/** Fallback for small files when the browser cannot upload to R2 directly (?key, raw body). */
export const PUT = withApiHandler(async (request: NextRequest, { params }) => {
  requireAdmin(request, { mutating: true });
  const id = await assertReportExists((await params).id ?? "");
  if (Number(request.headers.get("content-length") ?? 0) > MEDIA_PROXY_LIMIT) throw new BadRequestError("File too large for this upload path.");
  const key = request.nextUrl.searchParams.get("key") ?? "";
  await proxyMediaUpload(id, key, await request.arrayBuffer(), request.headers.get("content-type") ?? "");
  return ok({ key });
});

/** Removes one photo or video an operator added (?key). */
export const DELETE = withApiHandler(async (request: NextRequest, { params }) => {
  requireAdmin(request, { mutating: true });
  const id = ((await params).id ?? "").toLowerCase();
  await deleteMedia(id, request.nextUrl.searchParams.get("key") ?? "");
  return ok({ deleted: true });
});
