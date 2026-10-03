import https from "node:https";
import tls from "node:tls";
import { PUMPING_STATIONS_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Google serves this Apps Script deployment with X-Frame-Options: SAMEORIGIN,
 * so a direct iframe on the command center is refused. The wrapper page also
 * will not boot its sandbox when it is served from another origin.
 *
 * The dashboard document is embedded in that wrapper as `userHtml`. This route
 * returns that document from our origin, which the command center can frame.
 */
export async function GET() {
  let page: UpstreamResponse;

  try {
    page = await fetchAppsScriptHtml(PUMPING_STATIONS_URL);
  } catch {
    return new Response("Unable to load the pumping stations dashboard.", {
      status: 502,
    });
  }

  if (page.status < 200 || page.status >= 300) {
    return new Response("Unable to load the pumping stations dashboard.", {
      status: page.status,
    });
  }

  const userHtml = extractUserHtml(page.body.toString("utf8"));
  if (!userHtml) {
    return new Response("Unable to load the pumping stations dashboard.", {
      status: 502,
    });
  }

  return new Response(userHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
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

interface UpstreamResponse {
  status: number;
  body: Buffer;
}

function fetchAppsScriptHtml(url: string, redirects = 0): Promise<UpstreamResponse> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com") {
    return Promise.reject(new Error("Upstream host is not allowed."));
  }

  return new Promise((resolve, reject) => {
    const request = https.get(
      {
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        ca: tls.getCACertificates("system"),
        rejectUnauthorized: true,
      },
      (response) => {
        const status = response.statusCode ?? 500;
        const location = response.headers.location;

        if (status >= 300 && status < 400 && location && redirects < 5) {
          response.resume();
          resolve(fetchAppsScriptHtml(new URL(location, parsed).toString(), redirects + 1));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({ status, body: Buffer.concat(chunks) });
        });
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("Pumping stations dashboard request timed out."));
    });
    request.on("error", reject);
  });
}
