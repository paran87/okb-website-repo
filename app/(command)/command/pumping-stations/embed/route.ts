import https from "node:https";
import tls from "node:tls";
import { PUMPING_STATIONS_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const REQUEST_TIMEOUT_MS = 20_000;

const ALLOWED_HOSTS = new Set([
  "script.google.com",
  "script.googleusercontent.com",
]);

/**
 * Google serves this Apps Script deployment with X-Frame-Options: SAMEORIGIN,
 * so a direct iframe on the command center is refused. The wrapper page also
 * will not boot its sandbox when it is served from another origin.
 *
 * The dashboard document is embedded in that wrapper as `userHtml`. This route
 * returns that document from our origin, which the command center can frame.
 */
export async function GET() {
  let page: UpstreamPage;

  try {
    page = await fetchAppsScriptHtml(PUMPING_STATIONS_URL);
  } catch {
    return loadError(502);
  }

  if (page.status < 200 || page.status >= 300) {
    return loadError(page.status);
  }

  const userHtml = dashboardDocument(page.body);
  if (!userHtml) {
    return loadError(502);
  }

  return new Response(userHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function loadError(status: number): Response {
  return new Response("Unable to load the pumping stations dashboard.", {
    status,
  });
}

interface UpstreamPage {
  status: number;
  body: string;
}

function dashboardDocument(body: string): string | null {
  const extracted = extractUserHtml(body);
  if (extracted) return extracted;

  const trimmed = body.trimStart().toLowerCase();
  if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) {
    return body;
  }

  return null;
}

function extractUserHtml(wrapper: string): string | null {
  const marker = "goog.script.init(";
  const start = wrapper.indexOf(marker);
  if (start < 0) return null;

  let decoded: string;
  try {
    decoded = decodeJsString(wrapper, start + marker.length);
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(decoded) as { userHtml?: unknown };
    return typeof payload.userHtml === "string" && payload.userHtml.includes("<html")
      ? payload.userHtml
      : null;
  } catch {
    return null;
  }
}

function decodeJsString(source: string, quoteIndex: number): string {
  if (source[quoteIndex] !== '"') {
    throw new Error("Expected a JavaScript string.");
  }

  let result = "";
  for (let index = quoteIndex + 1; index < source.length; index += 1) {
    const char = source[index];
    if (char === "\\") {
      const next = source[index + 1];
      if (next === "x") {
        result += String.fromCharCode(Number.parseInt(source.slice(index + 2, index + 4), 16));
        index += 3;
        continue;
      }
      if (next === "u") {
        result += String.fromCharCode(Number.parseInt(source.slice(index + 2, index + 6), 16));
        index += 5;
        continue;
      }
      const escapes: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        "\\": "\\",
        '"': '"',
        "'": "'",
        "/": "/",
      };
      result += escapes[next] ?? next;
      index += 1;
      continue;
    }
    if (char === '"') return result;
    result += char;
  }

  throw new Error("Unterminated JavaScript string.");
}

async function fetchAppsScriptHtml(startUrl: string): Promise<UpstreamPage> {
  try {
    return await fetchWithCertificates(startUrl);
  } catch (error) {
    if (!isCertificateError(error) || typeof tls.getCACertificates !== "function") {
      throw error;
    }
    return fetchWithCertificates(startUrl, tls.getCACertificates("system"));
  }
}

function isCertificateError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  const code = error.code;
  return (
    code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
    code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY" ||
    code === "SELF_SIGNED_CERT_IN_CHAIN"
  );
}

async function fetchWithCertificates(
  startUrl: string,
  ca?: readonly string[],
): Promise<UpstreamPage> {
  let current = startUrl;

  for (let hop = 0; hop < 5; hop += 1) {
    const parsed = new URL(current);
    if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname)) {
      throw new Error("Upstream host is not allowed.");
    }

    const response = await requestGoogle(parsed, ca);
    if (response.status >= 300 && response.status < 400 && response.location) {
      current = new URL(response.location, parsed).toString();
      continue;
    }

    return {
      status: response.status,
      body: response.body.toString("utf8"),
    };
  }

  throw new Error("Too many redirects.");
}

interface GoogleResponse {
  status: number;
  location?: string;
  body: Buffer;
}

function requestGoogle(url: URL, ca?: readonly string[]): Promise<GoogleResponse> {
  return new Promise((resolve, reject) => {
    const request = https.get(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        ...(ca ? { ca: [...ca] } : {}),
        rejectUnauthorized: true,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          const location = response.headers.location;
          resolve({
            status: response.statusCode ?? 500,
            location: Array.isArray(location) ? location[0] : location,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("Pumping stations dashboard request timed out."));
    });
    request.on("error", reject);
  });
}
