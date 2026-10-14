import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getPublicAccomplishment } from "@/features/accomplishment/server/public-dashboard";

/** Shared by the CDN for 10 minutes (the sheet tabs themselves are cached as long), then refreshed in the background. */
const CACHE = "public, s-maxage=600, stale-while-revalidate=3600";

/** The public Accomplishment dashboard (OKB SSOT): progress, waterway details, resources and field updates. */
export const GET = withApiHandler(async () => {
  const response = ok(await getPublicAccomplishment());
  response.headers.set("Cache-Control", CACHE);
  return response;
});
