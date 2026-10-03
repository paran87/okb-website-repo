import { isRiverBasinFile } from "@/lib/river-basin/documents";
import { openDriveRange } from "@/lib/river-basin/drive-file";
import {
  getCachedStudyBytes,
  openSharedStudy,
  sliceRange,
} from "@/lib/river-basin/study-cache";

export const maxDuration = 60;

/** Range answers must never be shared between different byte ranges by a CDN. */
const RANGE_CACHE_CONTROL = "private, max-age=86400";
const FULL_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400";

/**
 * Serve a published river-basin study.
 *
 * Fast path: forward the request to Google Drive as a byte range, so the
 * viewer fetches only the pages it is showing. A plain GET answers with the
 * file size and starts streaming; the viewer cancels it as soon as it sees
 * ranges are supported. If Drive will not do ranges, fall back to the shared
 * full-file download.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await context.params;
  if (!isRiverBasinFile(fileId)) {
    return new Response("Not found", { status: 404 });
  }

  const range = request.headers.get("range");
  const baseHeaders = {
    "Content-Type": "application/pdf",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };

  // Already in memory on this instance: answer locally, no Drive round trip.
  const cached = getCachedStudyBytes(fileId);
  if (cached) {
    return serveBytes(cached, range, baseHeaders);
  }

  const drive = await openDriveRange(fileId, range ?? "bytes=0-");
  if (drive) {
    if (range) {
      return new Response(drive.body, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Cache-Control": RANGE_CACHE_CONTROL,
          "Content-Range": drive.contentRange,
          "Content-Length": String(drive.contentLength),
        },
      });
    }
    return new Response(drive.body, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Cache-Control": RANGE_CACHE_CONTROL,
        "Content-Length": String(drive.totalSize),
      },
    });
  }

  try {
    const study = await openSharedStudy(fileId);
    if (range) {
      const bytes = await study.bytes;
      if (!bytes) return new Response("Range not available", { status: 416 });
      return serveBytes(bytes, range, baseHeaders);
    }
    const headers = new Headers({
      ...baseHeaders,
      "Cache-Control": FULL_CACHE_CONTROL,
      "CDN-Cache-Control":
        "public, s-maxage=2592000, stale-while-revalidate=86400",
    });
    if (study.contentLength) {
      headers.set("Content-Length", String(study.contentLength));
    }
    return new Response(study.stream(), { status: 200, headers });
  } catch {
    return new Response("Study file is unavailable", { status: 502 });
  }
}

function serveBytes(
  bytes: Uint8Array,
  range: string | null,
  baseHeaders: Record<string, string>,
): Response {
  const headers = new Headers({
    ...baseHeaders,
    "Cache-Control": RANGE_CACHE_CONTROL,
  });
  if (!range) {
    headers.set("Content-Length", String(bytes.byteLength));
    return new Response(streamFrom(bytes), { status: 200, headers });
  }
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

function streamFrom(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}
