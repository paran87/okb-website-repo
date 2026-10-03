import { isRiverBasinFile } from "@/lib/river-basin/documents";
import { fetchDriveFile, webStream } from "@/lib/river-basin/drive-file";

export const dynamic = "force-dynamic";

/** Stream a published river-basin study so the page can render it in place. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await context.params;
  if (!isRiverBasinFile(fileId)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fetchDriveFile(fileId);
    if (file.status !== 200) {
      return new Response("Study file is unavailable", { status: 502 });
    }

    const headers = new Headers({
      "Content-Type": "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
    if (file.contentLength)
      headers.set("Content-Length", String(file.contentLength));

    return new Response(webStream(file.stream), { status: 200, headers });
  } catch {
    return new Response("Study file is unavailable", { status: 502 });
  }
}
