import { isRiverBasinFile } from "@/lib/river-basin/documents";
import { openSharedStudy, sliceRange } from "@/lib/river-basin/study-cache";

export const maxDuration = 60;

const cacheControl =
  "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400";

/** Stream a published river-basin study so the page can render as bytes arrive. */
export async function GET(
  request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await context.params;
  if (!isRiverBasinFile(fileId)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const study = await openSharedStudy(fileId);
    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Cache-Control": cacheControl,
      "CDN-Cache-Control":
        "public, s-maxage=2592000, stale-while-revalidate=86400",
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
    });

    const range = request.headers.get("range");
    if (range) {
      const bytes = await study.bytes;
      if (!bytes) return new Response("Range not available", { status: 416 });
      const slice = sliceRange(bytes, range);
      if (!slice) {
        headers.set("Content-Range", `bytes */${bytes.byteLength}`);
        return new Response("Range not satisfiable", { status: 416, headers });
      }
      headers.set("Content-Length", String(slice.body.byteLength));
      headers.set(
        "Content-Range",
        `bytes ${slice.start}-${slice.end}/${bytes.byteLength}`,
      );
      return new Response(streamFrom(slice.body), { status: 206, headers });
    }

    if (study.contentLength) {
      headers.set("Content-Length", String(study.contentLength));
    }
    return new Response(study.stream(), { status: 200, headers });
  } catch {
    return new Response("Study file is unavailable", { status: 502 });
  }
}

function streamFrom(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
