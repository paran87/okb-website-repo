import https from "node:https";
import tls from "node:tls";

const USER_AGENT =
  "Mozilla/5.0 (compatible; OKB-Command-Center/1.0; +https://okb-website-repo.vercel.app)";

type Downloaded = {
  status: number;
  contentType: string;
  cookies: string;
  body: Buffer;
};

/**
 * Download a public Google Drive file.
 *
 * Vercel trusts the public certificate store through fetch. Windows dev
 * machines sometimes need the OS store instead. Google also wraps some
 * downloads in an HTML confirmation page, which this follows.
 */
export async function downloadDriveFile(fileId: string): Promise<Buffer> {
  const start = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  const first = await download(start);
  if (!isHtml(first)) return requireOk(first);

  const next = confirmUrl(first.body.toString("utf8"), fileId);
  const second = await download(next, first.cookies);
  return requireOk(second);
}

function requireOk(file: Downloaded): Buffer {
  if (file.status !== 200 || isHtml(file)) {
    throw new Error("Google Drive did not return the study file.");
  }
  return file.body;
}

function isHtml(file: Downloaded): boolean {
  return (
    file.contentType.includes("text/html") ||
    file.body.subarray(0, 15).toString("utf8").includes("<!DOCTYPE")
  );
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

async function download(url: string, cookies = ""): Promise<Downloaded> {
  try {
    return await downloadWithFetch(url, cookies);
  } catch (error) {
    if (!isCertificateError(error)) throw error;
    return downloadWithSystemCertificates(url, cookies);
  }
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

async function downloadWithFetch(
  url: string,
  cookies: string,
): Promise<Downloaded> {
  const response = await fetch(url, {
    redirect: "manual",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "*/*",
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });
  return readWebResponse(response, url, cookies, 0);
}

async function readWebResponse(
  response: Response,
  url: string,
  cookies: string,
  redirects: number,
): Promise<Downloaded> {
  const nextCookies = mergeCookies(cookies, response.headers);
  const location = response.headers.get("location");
  if (response.status >= 300 && response.status < 400 && location) {
    if (redirects > 5)
      throw new Error(
        "Too many redirects while downloading a river basin file.",
      );
    return downloadWithFetch(new URL(location, url).toString(), nextCookies);
  }

  const body = Buffer.from(await response.arrayBuffer());
  return {
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    cookies: nextCookies,
    body,
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
