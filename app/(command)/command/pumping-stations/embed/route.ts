import https from "node:https";
import tls from "node:tls";
import { PUMPING_STATIONS_EMBED_PATH, PUMPING_STATIONS_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SCRIPT_ORIGIN = "https://script.google.com";
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Google serves this Apps Script wrapper with X-Frame-Options: SAMEORIGIN,
 * which blocks a direct iframe on the command center. This route serves the
 * wrapper from our origin and forwards the runtime calls (`/wardeninit`,
 * `/static/macros`, `/macros`, `/blank`) that the wrapper makes as
 * root-relative URLs.
 *
 * Those asset tags are rewritten to script.google.com. Root-relative XHR is
 * redirected at the bootstrap below, because a cross-origin call from this
 * page would be blocked by CORS.
 */
export async function GET(request: Request) {
  return handle(request, "GET");
}

export async function POST(request: Request) {
  return handle(request, "POST");
}

async function handle(request: Request, method: "GET" | "POST") {
  const upstreamParam = new URL(request.url).searchParams.get("upstream");

  if (upstreamParam) {
    const upstream = resolveUpstream(upstreamParam);
    if (!upstream) {
      return new Response("Upstream path is not allowed.", { status: 400 });
    }

    return proxyGoogle(upstream, method, request);
  }

  if (method !== "GET") {
    return new Response("Not found.", { status: 404 });
  }

  let page: UpstreamResponse;
  try {
    page = await requestGoogle(new URL(PUMPING_STATIONS_URL), "GET");
  } catch {
    return new Response("Unable to load the pumping stations dashboard.", {
      status: 502,
    });
  }

  console.log(
    "wrapper cookies",
    page.cookies.map((cookie) => cookie.split("=")[0]).join(",") || "(none)",
  );

  if (page.status < 200 || page.status >= 300) {
    return new Response("Unable to load the pumping stations dashboard.", {
      status: page.status,
    });
  }

  const html = rewriteStaticUrls(page.body.toString("utf8")).replace(
    "<head>",
    `<head><script>${BOOTSTRAP}</script>`,
  );

  return htmlResponse(html);
}

function resolveUpstream(raw: string): URL | null {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  let url: URL;
  try {
    url = new URL(decoded, SCRIPT_ORIGIN);
  } catch {
    return null;
  }

  if (url.origin !== SCRIPT_ORIGIN || !isAllowedPath(url.pathname)) return null;
  return url;
}

function isAllowedPath(pathname: string): boolean {
  return (
    pathname === "/wardeninit" ||
    pathname === "/blank" ||
    pathname.startsWith("/static/macros/") ||
    pathname.startsWith("/macros/")
  );
}

async function proxyGoogle(
  url: URL,
  method: "GET" | "POST",
  request: Request,
): Promise<Response> {
  const body =
    method === "POST" ? Buffer.from(await request.arrayBuffer()) : undefined;
  const contentType = request.headers.get("content-type");

  if (url.pathname === "/wardeninit" && body) {
    const keys = body
      .toString("utf8")
      .split("&")
      .map((part) => decodeURIComponent(part.split("=")[0] ?? ""))
      .slice(0, 40);
    console.log("warden body", body.length, keys.join(","));
  }

  let upstream: UpstreamResponse;
  try {
    upstream = await requestGoogle(url, method, {
      body,
      contentType: contentType ?? undefined,
    });
  } catch {
    return new Response("Unable to load the pumping stations dashboard.", {
      status: 502,
    });
  }

  if (url.pathname === "/wardeninit") {
    console.log(
      "wardeninit",
      upstream.status,
      upstream.body.length,
      upstream.body.subarray(0, 240).toString("utf8"),
    );
  }

  const type = upstream.contentType || "text/plain; charset=utf-8";
  const payload = shouldRewrite(type)
    ? Buffer.from(rewriteStaticUrls(upstream.body.toString("utf8")))
    : upstream.body;

  return new Response(new Uint8Array(payload), {
    status: upstream.status,
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-store",
    },
  });
}

interface UpstreamResponse {
  status: number;
  contentType: string;
  body: Buffer;
  cookies: string[];
}

function requestGoogle(
  url: URL,
  method: "GET" | "POST",
  init?: { body?: Buffer; contentType?: string },
  redirects = 0,
): Promise<UpstreamResponse> {
  if (url.protocol !== "https:" || url.hostname !== "script.google.com") {
    return Promise.reject(new Error("Upstream host is not allowed."));
  }

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method,
        headers: {
          Accept: "*/*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Origin: SCRIPT_ORIGIN,
          Referer: PUMPING_STATIONS_URL,
          "X-Same-Domain": "1",
          ...(init?.contentType ? { "Content-Type": init.contentType } : {}),
          ...(init?.body ? { "Content-Length": init.body.length } : {}),
        },
        ca: tls.getCACertificates("system"),
        rejectUnauthorized: true,
      },
      (response) => {
        const status = response.statusCode ?? 500;
        const location = response.headers.location;

        if (status >= 300 && status < 400 && location && redirects < 5) {
          response.resume();
          const next = new URL(location, url);
          resolve(requestGoogle(next, method, init, redirects + 1));
          return;
        }

        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          const contentType = response.headers["content-type"];
          const setCookie = response.headers["set-cookie"] ?? [];
          resolve({
            status,
            contentType: Array.isArray(contentType)
              ? contentType[0]
              : (contentType ?? ""),
            body: Buffer.concat(chunks),
            cookies: Array.isArray(setCookie) ? setCookie : [setCookie],
          });
        });
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error("Pumping stations dashboard request timed out."));
    });
    request.on("error", reject);
    if (init?.body) request.write(init.body);
    request.end();
  });
}

function shouldRewrite(contentType: string): boolean {
  return /text\/|javascript|json|xml/i.test(contentType);
}

function rewriteStaticUrls(source: string): string {
  return source.replaceAll('"/static/', `"${SCRIPT_ORIGIN}/static/`);
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

const BOOTSTRAP = `
(function () {
  var PROXY = ${JSON.stringify(PUMPING_STATIONS_EMBED_PATH)};
  function rewrite(raw) {
    try {
      var url = new URL(raw, location.origin);
      var onGoogle =
        url.origin === location.origin || url.hostname === "script.google.com";
      if (!onGoogle) return String(raw);
      var path = url.pathname;
      if (
        path === "/wardeninit" ||
        path === "/blank" ||
        path.indexOf("/static/") === 0 ||
        path.indexOf("/macros/") === 0
      ) {
        return PROXY + "?upstream=" + encodeURIComponent(path + url.search);
      }
    } catch (e) {}
    return raw;
  }
  var open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = rewrite(url);
    return open.apply(this, args);
  };
  var setHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (String(name).toLowerCase() === "x-same-domain") return;
    return setHeader.call(this, name, value);
  };
  function withoutSameDomain(headers) {
    var next = new Headers(headers || {});
    next.delete("x-same-domain");
    return next;
  }
  if (window.fetch) {
    var fetchImpl = window.fetch;
    window.fetch = function (input, init) {
      var request = new Request(input, init);
      var headers = withoutSameDomain(request.headers);
      var url = rewrite(request.url);
      if (request.method === "GET" || request.method === "HEAD") {
        return fetchImpl.call(window, url, {
          method: request.method,
          headers: headers,
          credentials: "same-origin",
          cache: "no-store",
          redirect: request.redirect,
        });
      }
      return request.arrayBuffer().then(function (body) {
        return fetchImpl.call(window, url, {
          method: request.method,
          headers: headers,
          body: body,
          credentials: "same-origin",
          cache: "no-store",
          redirect: request.redirect,
        });
      });
    };
  }
  if (navigator.sendBeacon) {
    var beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      return beacon(rewrite(url), data);
    };
  }
})();
`.trim();
