import { NextResponse, type NextRequest } from "next/server";
import { ApiError, NotFoundError } from "@/lib/api/errors";
import { withApiHandler } from "@/lib/api/handler";
import {
  collectedFile,
  LINK_TTL_S,
} from "@/features/media-collector/server/store";
import {
  getOperationsR2Config,
  presign,
} from "@/features/operations/server/r2";
import { requireReportsAccess } from "@/features/reports/server/access";

export const dynamic = "force-dynamic";

// A collector item id, or "b-<id>" for a file uploaded by the Android bridge.
const FILE_REF =
  /^(b-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Opens (or with ?download=1 downloads) an original collected file: checks operator access, then redirects to a
 * 10-minute signed R2 link. The bucket stays private; links are never stored or listed.
 */
export const GET = withApiHandler(async (request: NextRequest, { params }) => {
  const { store } = await requireReportsAccess(request, { area: "settings" });
  const id = (await params).id ?? "";
  if (store.kind === "fixtures" || !FILE_REF.test(id))
    throw new NotFoundError("File not found");
  const file = await collectedFile(id);
  if (!file) throw new NotFoundError("No stored file for this item");
  const cfg = getOperationsR2Config();
  if (!cfg) {
    throw new ApiError(
      503,
      "INTERNAL_ERROR",
      "The media storage (Cloudflare R2) is not configured on the server.",
      { reason: "storage_not_configured" },
    );
  }
  const download = request.nextUrl.searchParams.get("download") === "1";
  const safeName =
    file.fileName.replace(/["\\\r\n]/g, "").slice(0, 200) || "file";
  const query: Record<string, string> = {
    "response-content-disposition": `${download ? "attachment" : "inline"}; filename="${safeName.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
  };
  // Documents are never rendered as HTML by the browser, whatever their content.
  if (file.mimeType) query["response-content-type"] = file.mimeType;
  const url = presign(cfg, "GET", file.key, { query, expiresIn: LINK_TTL_S });
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
});
