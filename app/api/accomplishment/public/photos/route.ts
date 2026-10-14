import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getFieldPhotos } from "@/features/accomplishment/server/public-dashboard";

/** Shared by the CDN for 10 minutes (the sheet tabs themselves are cached as long), then refreshed in the background. */
const CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

/** Every field photo of the OKB SSOT (WaterwayvsPicture), newest first. */
export const GET = withApiHandler(async () => {
  const response = ok(await getFieldPhotos());
  response.headers.set("Cache-Control", CACHE);
  return response;
});
