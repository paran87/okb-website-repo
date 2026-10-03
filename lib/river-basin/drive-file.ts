import https from "node:https";
import { Readable } from "node:stream";
import tls from "node:tls";

const USER_AGENT =
  "Mozilla/5.0 (compatible; OKB-Command-Center/1.0; +https://okb-website-repo.vercel.app)";

type Downloaded = {
  status: number;
  contentType: string;
  cookies: string;
  body: Buffer;
};

export type DriveStream = {
  body: ReadableStream<Uint8Array>;
  contentLength: number | null;
};

type Opened = {
  cookies: string;
  stream?: DriveStream;
  html?: string;
};

export type DriveRange = {
  body: ReadableStream<Uint8Array>;
  /** Raw Content-Range header, e.g. "bytes 0-1023/59989280". */
  contentRange: string;
  /** Bytes in this slice. */
  contentLength: number;
  /** Size of the whole file. */
  totalSize: number;
};

/**
 * Ask Google Drive for just a byte range of a public file.
 *
 * usercontent.google.com honours Range, so the viewer can pull the pages it
 * needs from a 60 MB study instead of waiting for the whole download.
 * Returns null whenever Drive does not answer with a clean 206 so callers can
 * fall back to the full-file path.
 */
export async function openDriveRange(
  fileId: string,
  range: string,
): Promise<DriveRange | null> {
  const url = new URL("https://drive.usercontent.google.com/download");
  url.searchParams.set("id", fileId);
  url.searchParams.set("export", "download");
  url.searchParams.set("confirm", "t");

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "*/*", Range: range },
    });
    const contentRange = response.headers.get("content-range");
    const total = contentRange?.match(/\/(\d+)$/)?.[1];
    const length = Number(response.headers.get("content-length"));
    if (
      response.status !== 206 ||
      !response.body ||
      !contentRange ||
      !total ||
      !Number.isFinite(length)
    ) {
      await response.body?.cancel().catch(() => undefined);
      return null;
    }
    return {
      body: response.body,
      contentRange,
      contentLength: length,
      totalSize: Number(total),
    };
  } catch {
    return null;
  }
}

/**
 * Open a public Google Drive file as a stream.
 *
 * The PDF is forwarded as Google sends it, instead of waiting for the whole
 * file to land on the server first. Vercel uses the public certificate store.
 * Windows dev machines fall back to the OS store.
 */
export async function openDriveFile(fileId: string): Promise<DriveStream> {
  const start = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  const first = await openUrl(start);
  if (first.stream) return first.stream;

  const next = confirmUrl(first.html ?? "", fileId);
  const second = await openUrl(next, first.cookies);
  if (!second.stream) {
    throw new Error("Google Drive did not return the study file.");
  }
  return second.stream;
}

function confirmUrl(html: string, fileId: string): string {
  const action = html.match(
    /action="(https:\/\/drive\.usercontent\.google\.com\/[^"]+)"/i,
  );
  const url = action?.[1]
    ? new URL(action[1].replaceAll("&amp;", "&"))
    : new URL("https://drive.usercontent.google.com/download");

  const fields = html.matchAll(/name="([^"]+)"\s+value="([^"]*)"/gi);
  for (const field of fields) {
    const name = field[1];
    const value = field[2];
    if (name) url.searchParams.set(name, value?.replaceAll("&amp;", "&") ?? "");
  }
  url.searchParams.set("id", fileId);
  url.searchParams.set("export", "download");
  if (!url.searchParams.get("confirm")) url.searchParams.set("confirm", "t");
  return url.toString();
}

async function openUrl(url: string, cookies = ""): Promise<Opened> {
  try {
    return await openWithFetch(url, cookies);
  } catch (error) {
    if (!isCertificateError(error)) throw error;
    const file = await downloadWithSystemCertificates(url, cookies);
    return openedFromBuffer(file);
  }
}

function openedFromBuffer(file: Downloaded): Opened {
  const html =
    file.contentType.includes("text/html") ||
    file.body.subarray(0, 15).toString("utf8").includes("<!DOCTYPE");
  if (html) return { cookies: file.cookies, html: file.body.toString("utf8") };
  if (file.status !== 200) {
    throw new Error("Google Drive did not return the study file.");
  }
  return {
    cookies: file.cookies,
    stream: {
      body: Readable.toWeb(
        Readable.from(file.body),
      ) as ReadableStream<Uint8Array>,
      contentLength: file.body.byteLength,
    },
  };
}

function isCertificateError(error: unknown): boolean {
  const cause = error instanceof Error ? error.cause : undefined;
  const message = [error, cause]
    .map((item) => {
      if (item instanceof Error) {
        const code = "code" in item ? String(item.code) : "";
        return `${item.message} ${code}`;
      }
      return String(item ?? "");
    })
    .join(" ");
  return /certificate|UNABLE_TO_VERIFY|SELF_SIGNED|unable to verify/i.test(
    message,
  );
}

async function openWithFetch(
  url: string,
  cookies: string,
  redirects = 0,
): Promise<Opened> {
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "*/*",
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });
  const nextCookies = mergeCookies(cookies, response.headers);
  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    if (redirects > 5) {
      throw new Error(
        "Too many redirects while downloading a river basin file.",
      );
    }
    return openWithFetch(
      new URL(location, url).toString(),
      nextCookies,
      redirects + 1,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    return { cookies: nextCookies, html: await response.text() };
  }
  if (!response.ok || !response.body) {
    throw new Error("Google Drive did not return the study file.");
  }

  const lengthHeader = response.headers.get("content-length");
  const contentLength = lengthHeader ? Number(lengthHeader) : null;
  return {
    cookies: nextCookies,
    stream: {
      body: response.body,
      contentLength: Number.isFinite(contentLength) ? contentLength : null,
    },
  };
}

function mergeCookies(existing: string, headers: Headers): string {
  const jar = new Map(
    existing
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator), part.slice(separator + 1)] as const;
      }),
  );

  const setCookie =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter((value): value is string =>
          Boolean(value),
        );

  for (const cookie of setCookie) {
    const pair = cookie.split(";")[0]?.trim();
    if (!pair) continue;
    const separator = pair.indexOf("=");
    if (separator > 0)
      jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }

  return [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function downloadWithSystemCertificates(
  url: string,
  cookies: string,
  redirects = 0,
): Promise<Downloaded> {
  if (redirects > 5) {
    return Promise.reject(
      new Error("Too many redirects while downloading a river basin file."),
    );
  }

  const parsed = new URL(url);
  const certificates = systemCertificates();

  return new Promise((resolve, reject) => {
    const request = https.get(
      {
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "*/*",
          ...(cookies ? { Cookie: cookies } : {}),
        },
        ...(certificates ? { ca: certificates } : {}),
        rejectUnauthorized: true,
      },
      (response) => {
        const nextCookies = mergeNodeCookies(
          cookies,
          response.headers["set-cookie"],
        );
        const status = response.statusCode ?? 500;
        const location = response.headers.location;
        if (status >= 300 && status < 400 && location) {
          response.resume();
          resolve(
            downloadWithSystemCertificates(
              new URL(location, url).toString(),
              nextCookies,
              redirects + 1,
            ),
          );
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            status,
            contentType: String(response.headers["content-type"] ?? ""),
            cookies: nextCookies,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    request.setTimeout(60_000, () => {
      request.destroy(new Error("Timed out downloading a river basin file."));
    });
    request.on("error", reject);
  });
}

function mergeNodeCookies(
  existing: string,
  setCookie: string[] | undefined,
): string {
  const header = new Headers();
  for (const cookie of setCookie ?? []) header.append("set-cookie", cookie);
  return mergeCookies(existing, header);
}

function systemCertificates(): string[] | undefined {
  const getCertificates = (
    tls as { getCACertificates?: (type?: string) => string[] }
  ).getCACertificates;
  if (typeof getCertificates !== "function") return undefined;
  try {
    const certificates = getCertificates("system");
    return certificates.length > 0 ? certificates : undefined;
  } catch {
    return undefined;
  }
}
