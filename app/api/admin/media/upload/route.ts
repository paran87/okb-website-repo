import type { NextRequest } from "next/server";
import { z } from "zod";
import { BadRequestError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { mediaCollection } from "@/features/admin/collections";
import { createUploadTicket, ensureDirectUploads, PROXY_LIMIT, proxyUpload } from "@/features/admin/server/media";
import { requireAdmin, siteOrigin } from "@/features/admin/server/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ticketSchema = z.object({
  collection: z.string().min(1),
  fileName: z.string().min(1).max(255),
  contentType: z.string().max(100).default(""),
  size: z.number().int().positive(),
});

/** A short-lived link the browser uploads the file to (straight to R2). */
export const POST = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request, { mutating: true });
  const body = ticketSchema.parse(await request.json());
  const c = mediaCollection(body.collection);
  if (!c) throw new NotFoundError("Unknown collection");
  // Large files go straight to R2, which must allow this site (set up here, no switch to turn on).
  await ensureDirectUploads(siteOrigin(request));
  return ok(await createUploadTicket(c, body.fileName, body.contentType, body.size));
});

/** Fallback for small files when the browser cannot upload to R2 directly (?collection&key, raw body). */
export const PUT = withApiHandler(async (request: NextRequest) => {
  requireAdmin(request, { mutating: true });
  const params = request.nextUrl.searchParams;
  const c = mediaCollection(params.get("collection"));
  if (!c) throw new NotFoundError("Unknown collection");
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > PROXY_LIMIT) throw new BadRequestError("File too large for this upload path.");
  const body = await request.arrayBuffer();
  await proxyUpload(c, params.get("key") ?? "", body, request.headers.get("content-type") ?? "");
  return ok({ key: params.get("key") });
});
