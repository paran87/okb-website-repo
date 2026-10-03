import { withApiHandler } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getPagasaWeatherBulletin } from "@/features/weather/services/pagasa.service";

export const dynamic = "force-dynamic";
// PAGASA pages are large and slow from overseas hosts; allow time for retries.
export const maxDuration = 60;

/** Live DOST-PAGASA weather bulletin for the Command Center. */
export const GET = withApiHandler(async () => {
  const bulletin = await getPagasaWeatherBulletin();
  return ok(bulletin, {
    meta: {
      source: bulletin.source,
      fetchedAt: bulletin.fetchedAt,
      ...(bulletin.fallbackReason ? { fallbackReason: bulletin.fallbackReason } : {}),
    },
  });
});
