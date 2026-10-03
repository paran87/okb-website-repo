import { isRiverBasinFile } from "@/lib/river-basin/documents";
import { downloadDriveFile } from "@/lib/river-basin/drive-file";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const file = await downloadDriveFile(fileId);
    if (!file.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return new Response("Study file is unavailable", { status: 502 });
    }

    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(file.byteLength),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Study file is unavailable", { status: 502 });
  }
}
