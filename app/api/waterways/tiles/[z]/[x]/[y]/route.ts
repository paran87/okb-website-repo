import {
  BLANK_PNG,
  parseClasses,
  parseOverlay,
  parseUrbs,
  renderTile,
  tileTouchesBasins,
} from "@/features/waterways/services/arcgis";

export const maxDuration = 60;

const CACHE_OK =
  "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400";
const CACHE_ERROR = "public, max-age=30, s-maxage=30";

function png(body: Buffer, cache: string, status = 200) {
  return new Response(new Uint8Array(body), {
    status,
    headers: { "Content-Type": "image/png", "Cache-Control": cache },
  });
}

/**
 * Map tile of the DENR river system (styled by discharge) or of a reference
 * layer. Tiles are rendered by the DENR server on demand and cached by the CDN,
 * so each tile is requested from the government server at most once per week.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const { z, x, y } = await context.params;
  const zi = Number(z);
  const xi = Number(x);
  const yi = Number(y);
  const max = 2 ** zi;
  if (
    ![zi, xi, yi].every(Number.isInteger) ||
    zi < 0 ||
    zi > 20 ||
    xi < 0 ||
    yi < 0 ||
    xi >= max ||
    yi >= max
  ) {
    return new Response("Bad tile", { status: 400 });
  }
  if (!tileTouchesBasins(zi, xi, yi)) return png(BLANK_PNG, CACHE_OK);

  const url = new URL(request.url);
  try {
    const tile = await renderTile({
      z: zi,
      x: xi,
      y: yi,
      overlayLayer: parseOverlay(url.searchParams.get("o")),
      urbs: parseUrbs(url.searchParams.get("u")),
      classes: parseClasses(url.searchParams.get("q")),
    });
    return png(tile, CACHE_OK);
  } catch {
    return png(BLANK_PNG, CACHE_ERROR);
  }
}
