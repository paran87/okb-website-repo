import type { NextRequest } from "next/server";
import { getNcrBoardPages } from "@/features/accomplishment/server/ncr-daily";

export const maxDuration = 30;

/**
 * One page image of the NCR Daily Accomplishment board (?board=ID&page=N), fetched from Canva on the server and
 * served from this site. Browsers loading every Canva link directly drop many of them (expired signed
 * links, a burst of large requests); this route always uses a fresh link and the CDN keeps the result.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const page = Number(request.nextUrl.searchParams.get("page"));
  const pages = await getNcrBoardPages(request.nextUrl.searchParams.get("board") ?? "daily").catch(() => null);
  const target = pages?.find((p) => p.page === page);
  if (!target) return new Response("Not found", { status: 404 });

  let url: URL;
  try {
    url = new URL(target.url);
  } catch {
    return new Response("Bad image link", { status: 502 });
  }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".canva.com")) {
    return new Response("Bad image link", { status: 502 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(25_000) });
  } catch {
    return new Response("Canva could not be reached", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) return new Response("Image unavailable", { status: 502 });

  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "image/png",
    // Shared cache for 30 minutes (the signed link behind it lasts about an hour), then refreshed in the background.
    "Cache-Control": "public, max-age=900, s-maxage=1800, stale-while-revalidate=3600",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { status: 200, headers });
}
