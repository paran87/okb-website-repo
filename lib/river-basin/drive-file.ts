import type { IncomingMessage } from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import tls from "node:tls";

const USER_AGENT = "OKB-Command-Center/1.0";

export type DriveFileStream = {
  status: number;
  stream: Readable;
  contentLength: number | null;
};

/**
 * Download a public Google Drive file, following the confirm redirect Google
 * uses for larger documents. Trusts the OS certificate store.
 */
export function fetchDriveFile(fileId: string): Promise<DriveFileStream> {
  const url = `https://drive.google.com/uc?export=download&confirm=t&id=${encodeURIComponent(fileId)}`;
  return request(url, 0);
}

function request(url: string, redirects: number): Promise<DriveFileStream> {
  if (redirects > 5) {
    return Promise.reject(
      new Error("Too many redirects while downloading a river basin file."),
    );
  }

  const parsed = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.get(
      {
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
        ca: tls.getCACertificates("system"),
        rejectUnauthorized: true,
      },
      (response) => {
        const status = response.statusCode ?? 500;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          response.resume();
          resolve(request(new URL(location, url).toString(), redirects + 1));
          return;
        }

        const contentType = String(response.headers["content-type"] ?? "");
        if (contentType.includes("text/html")) {
          response.resume();
          reject(
            new Error(
              "Google Drive returned a confirmation page instead of the file.",
            ),
          );
          return;
        }

        const lengthHeader = response.headers["content-length"];
        const contentLength = lengthHeader ? Number(lengthHeader) : null;
        resolve({
          status,
          stream: response,
          contentLength: Number.isFinite(contentLength) ? contentLength : null,
        });
      },
    );

    req.setTimeout(120_000, () => {
      req.destroy(new Error("Timed out downloading a river basin file."));
    });
    req.on("error", reject);
  });
}

export function webStream(
  stream: IncomingMessage | Readable,
): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}
