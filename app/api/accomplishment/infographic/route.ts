import type { NextRequest } from "next/server";
import { drivePhoto, infographicAssets } from "@/features/accomplishment/infographic/assets";
import { getHighlights, highlightsConfigured } from "@/features/accomplishment/infographic/highlights";
import { renderInfographic, type InfographicPhoto } from "@/features/accomplishment/infographic/render";
import { buildInfographic, parseInfographicFilter } from "@/features/accomplishment/infographic/summary";
import { getFieldPhotos, getPublicAccomplishment } from "@/features/accomplishment/server/public-dashboard";
import { clientIp } from "@/features/flood-report/server/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger.child({ module: "accomplishment-infographic" });

/** AI-written highlights per address: at most this many images with AI text per 10 minutes (then rule-based text). */
const AI_LIMIT = 12;
const aiHits = new Map<string, number[]>();
function aiAllowed(ip: string): boolean {
  const now = Date.now();
  const hits = (aiHits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (hits.length >= AI_LIMIT) return false;
  hits.push(now);
  aiHits.set(ip, hits);
  if (aiHits.size > 5000) aiHits.clear();
  return true;
}

/**
 * The accomplishment infographic as a PNG, for the record types and regions chosen on the dashboard:
 * ?types=waterway,drainage&regions=NCR,IV-A&mode=avg|wtd&ai=0|1[&download=1]
 */
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const filter = parseInfographicFilter(params);
  try {
    const [data, allPhotos, assets] = await Promise.all([getPublicAccomplishment(), getFieldPhotos().catch(() => []), infographicAssets()]);
    const summary = buildInfographic(data, filter, allPhotos);
    if (!summary.records) return new Response("No records with these settings.", { status: 404 });

    const useAi = params.get("ai") !== "0" && aiAllowed(clientIp(request));
    const [highlights, photoSrcs] = await Promise.all([getHighlights(summary, useAi), Promise.all(summary.photos.map((p) => drivePhoto(p.id)))]);
    const photos: InfographicPhoto[] = summary.photos.flatMap((p, i) => (photoSrcs[i] ? [{ src: photoSrcs[i], name: p.name, place: p.place, day: p.day }] : []));

    const image = renderInfographic(summary, highlights, assets, photos, request.nextUrl.host);
    const png = await image.arrayBuffer();
    const day = summary.asOf.slice(0, 10);
    const scope = [summary.scope.typesLabel, summary.scope.regionsLabel].join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return new Response(png, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `${params.get("download") === "1" ? "attachment" : "inline"}; filename="okb-accomplishment-${scope}-${day}.png"`,
        "Cache-Control": "private, max-age=600",
        "X-Highlights-By": highlights.by,
        // Whether this server can write highlights with AI at all (the sheet hides the option when not).
        "X-Highlights-Ai": highlightsConfigured() ? "on" : "off",
      },
    });
  } catch (err) {
    log.error({ err }, "Infographic failed");
    return new Response("The infographic could not be made. Try again in a moment.", { status: 500 });
  }
}
