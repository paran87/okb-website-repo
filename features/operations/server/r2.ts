import "server-only";
import { createHash, createHmac } from "node:crypto";

/**
 * Minimal Cloudflare R2 (S3 API) client: list, read, upload, move (copy +
 * delete), CORS. Server-side calls are signed with AWS Signature V4 in the
 * Authorization header (signRequest); short-lived query-signed links
 * (presign) are only handed to the browser for single-object uploads.
 * Credentials stay on the server.
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** S3 API host. Includes a jurisdiction label (for example `.eu`) when the bucket is not in the default location. */
  host: string;
}

export interface R2Object {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
}

function present(value: string | undefined): string | null {
  let trimmed = value?.trim() ?? "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed || null;
}

/**
 * Account id and S3 host. Accepts a bare account id or an endpoint copied from the
 * Cloudflare dashboard (`https://<accountid>.r2.cloudflarestorage.com`, including a
 * jurisdiction such as `.eu`).
 */
function resolveEndpoint(
  accountOrEndpoint: string,
  jurisdiction: string | null,
): { accountId: string; host: string } | null {
  const raw = accountOrEndpoint.trim().replace(/\/+$/, "");
  let host = "";
  if (raw.includes("://") || raw.includes("r2.cloudflarestorage.com")) {
    try {
      host = (
        raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`)
      ).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
  if (host) {
    const accountId = host.split(".")[0] ?? "";
    if (!accountId || accountId === "r2") return null;
    return { accountId, host };
  }
  const juris = jurisdiction?.replace(/^\.+|\.+$/g, "").toLowerCase() ?? "";
  const suffix =
    juris && juris !== "auto" && juris !== "default" ? `.${juris}` : "";
  return { accountId: raw, host: `${raw}${suffix}.r2.cloudflarestorage.com` };
}

/**
 * The operations media bucket, or null when R2 is not configured on the server.
 * Read with static `process.env.NAME` access so the values survive the production
 * server bundle (a dynamic `process.env[name]` lookup is not always kept).
 */
export function getOperationsR2Config(): R2Config | null {
  const accountOrEndpoint =
    present(process.env.OPERATIONS_R2_ENDPOINT) ??
    present(process.env.OPERATIONS_R2_ACCOUNT_ID) ??
    present(process.env.R2_ACCOUNT_ID);
  const accessKeyId =
    present(process.env.OPERATIONS_R2_ACCESS_KEY_ID) ??
    present(process.env.R2_ACCESS_KEY_ID);
  const secretAccessKey =
    present(process.env.OPERATIONS_R2_SECRET_ACCESS_KEY) ??
    present(process.env.R2_SECRET_ACCESS_KEY);
  const bucket =
    present(process.env.OPERATIONS_R2_BUCKET) ?? "okb-whatsapp-bridge-bucket";
  if (!accountOrEndpoint || !accessKeyId || !secretAccessKey) return null;
  const endpoint = resolveEndpoint(
    accountOrEndpoint,
    present(process.env.OPERATIONS_R2_JURISDICTION),
  );
  if (!endpoint) return null;
  return { ...endpoint, accessKeyId, secretAccessKey, bucket };
}

const sha256 = (data: string) =>
  createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) =>
  createHmac("sha256", key).update(data).digest();

/** RFC 3986 encoding as S3 expects (keeps "/" in object paths when asked). */
function encode(value: string, keepSlash = false): string {
  const out = encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return keepSlash ? out.replace(/%2F/g, "/") : out;
}

/**
 * Builds a SigV4 query-signed URL. Any `headers` given are signed and must be
 * sent with the request.
 */
export function presign(
  cfg: R2Config,
  method: "GET" | "PUT" | "DELETE" | "HEAD",
  key: string | null,
  opts: {
    query?: Record<string, string>;
    headers?: Record<string, string>;
    expiresIn?: number;
    at?: Date;
  } = {},
): string {
  const host = cfg.host || `${cfg.accountId}.r2.cloudflarestorage.com`;
  // ListBucket is path-style `/{bucket}/`. Without the trailing slash R2 redirects,
  // and the followed request no longer matches this signature.
  const path =
    key !== null
      ? `/${encode(cfg.bucket)}/${encode(key, true)}`
      : `/${encode(cfg.bucket)}/`;
  // A fixed signing time gives the same link on every request (the browser keeps the image cached).
  const now = opts.at ?? new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;

  const headers: Record<string, string> = { host };
  for (const [k, v] of Object.entries(opts.headers ?? {}))
    headers[k.toLowerCase()] = v.trim();
  const headerNames = Object.keys(headers).sort();
  const signedHeaders = headerNames.join(";");

  const query: Record<string, string> = {
    ...opts.query,
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    // R2 rejects a presigned request that omits this (the same parameter the AWS SDK sends).
    "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
    "X-Amz-Credential": `${cfg.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(opts.expiresIn ?? 300),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encode(k)}=${encode(query[k] ?? "")}`)
    .join("&");
  const canonicalHeaders = headerNames
    .map((h) => `${h}:${headers[h]}\n`)
    .join("");
  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, day);
  const kSigning = hmac(hmac(hmac(kDate, "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");
  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/**
 * Signs a request with an Authorization header (SigV4), the way the AWS SDK
 * calls S3. Used for every server-side call: R2 only promises query-signed
 * links for single-object operations, and refuses bucket-level ones (listing,
 * CORS) signed that way with AccessDenied. Every header in `headers` is
 * signed and must be sent as returned.
 */
export function signRequest(
  cfg: R2Config,
  method: "GET" | "PUT" | "DELETE" | "HEAD",
  key: string | null,
  opts: { query?: Record<string, string>; headers?: Record<string, string>; at?: Date } = {},
): { url: string; headers: Record<string, string> } {
  const host = cfg.host || `${cfg.accountId}.r2.cloudflarestorage.com`;
  const path =
    key !== null
      ? `/${encode(cfg.bucket)}/${encode(key, true)}`
      : `/${encode(cfg.bucket)}/`;
  const now = opts.at ?? new Date();
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;

  const headers: Record<string, string> = {
    host,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "x-amz-date": amzDate,
  };
  for (const [k, v] of Object.entries(opts.headers ?? {}))
    headers[k.toLowerCase()] = v.trim();
  const headerNames = Object.keys(headers).sort();
  const signedHeaders = headerNames.join(";");
  const query = opts.query ?? {};
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encode(k)}=${encode(query[k] ?? "")}`)
    .join("&");
  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    headerNames.map((h) => `${h}:${headers[h]}\n`).join(""),
    signedHeaders,
    headers["x-amz-content-sha256"],
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, day);
  const kSigning = hmac(hmac(hmac(kDate, "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");

  const { host: _host, ...sendHeaders } = headers;
  void _host;
  sendHeaders.authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    url: `https://${host}${path}${canonicalQuery ? `?${canonicalQuery}` : ""}`,
    headers: sendHeaders,
  };
}

/**
 * Fetches an R2 object or bucket resource with header signing and returns the
 * raw response (no status check), for streaming files through the site.
 */
export async function r2Fetch(
  cfg: R2Config,
  method: "GET" | "HEAD",
  key: string,
  opts: { headers?: Record<string, string>; signal?: AbortSignal } = {},
): Promise<Response> {
  const signed = signRequest(cfg, method, key, { headers: opts.headers });
  return fetch(signed.url, {
    method,
    headers: signed.headers,
    cache: "no-store",
    redirect: "manual",
    signal: opts.signal,
  });
}

export class R2Error extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    /** R2's own <Message>, when it sent one. */
    public readonly detail: string | null = null,
  ) {
    super(message);
    this.name = "R2Error";
  }
}

/** Signs (Authorization header) and sends one request; throws R2Error on failure. */
async function request(
  cfg: R2Config,
  method: "GET" | "PUT" | "DELETE" | "HEAD",
  key: string | null,
  opts: {
    query?: Record<string, string>;
    headers?: Record<string, string>;
    body?: BodyInit;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  const signed = signRequest(cfg, method, key, { query: opts.query, headers: opts.headers });
  return send(signed.url, { method, headers: signed.headers, body: opts.body, signal: opts.signal });
}

async function send(url: string, init: RequestInit = {}): Promise<Response> {
  // A signed request must be sent as-is. Following a redirect would change the path and fail the signature.
  let res: Response;
  try {
    res = await fetch(url, { ...init, cache: "no-store", redirect: "manual" });
  } catch {
    throw new R2Error("R2 request failed (network)", 0, "NetworkError");
  }
  if (res.status >= 300 && res.status < 400) {
    throw new R2Error(
      `R2 request failed (${res.status} Redirect)`,
      res.status,
      "Redirect",
    );
  }
  if (!res.ok && res.status !== 206) {
    const body = await res.text().catch(() => "");
    const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? (res.statusText || String(res.status));
    const detail = /<Message>([^<]+)<\/Message>/.exec(body)?.[1] ?? null;
    throw new R2Error(
      `R2 request failed (${res.status} ${code})`,
      res.status,
      code,
      detail,
    );
  }
  return res;
}

function xmlValue(block: string, tag: string): string {
  const raw =
    new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block)?.[1] ?? "";
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Every object under `prefix` (follows continuation tokens). */
export async function listObjects(
  cfg: R2Config,
  prefix: string,
): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let token: string | null = null;
  do {
    const query: Record<string, string> = {
      "list-type": "2",
      prefix,
      "max-keys": "1000",
    };
    if (token) query["continuation-token"] = token;
    const xml = await (await request(cfg, "GET", null, { query })).text();
    for (const [, block] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      if (!block) continue;
      objects.push({
        key: xmlValue(block, "Key"),
        size: Number(xmlValue(block, "Size")) || 0,
        lastModified: xmlValue(block, "LastModified"),
        etag: xmlValue(block, "ETag").replace(/"/g, ""),
      });
    }
    token =
      xmlValue(xml, "IsTruncated") === "true"
        ? xmlValue(xml, "NextContinuationToken") || null
        : null;
  } while (token);
  return objects;
}

/** The first [bytes] bytes of an object (for reading a photo's EXIF without downloading it). */
export async function readStart(
  cfg: R2Config,
  key: string,
  bytes: number,
): Promise<Uint8Array> {
  const range = `bytes=0-${bytes - 1}`;
  // The Range header has to be part of the signature; an unsigned Range is rejected.
  const res = await request(cfg, "GET", key, {
    headers: { range },
    signal: AbortSignal.timeout(8000),
  });
  return new Uint8Array(await res.arrayBuffer());
}

/** Moves an object to another key (copy, then delete the original). */
export async function moveObject(
  cfg: R2Config,
  from: string,
  to: string,
): Promise<void> {
  const copySource = `/${encode(cfg.bucket)}/${encode(from, true)}`;
  await request(cfg, "PUT", to, { headers: { "x-amz-copy-source": copySource } });
  await request(cfg, "DELETE", from);
}

/** True when an object exists at `key`. */
export async function objectExists(cfg: R2Config, key: string): Promise<boolean> {
  try {
    await request(cfg, "HEAD", key);
    return true;
  } catch (err) {
    if (err instanceof R2Error && err.status === 404) return false;
    throw err;
  }
}

/** Uploads a small object from the server (the direct browser upload is preferred). */
export async function putObject(
  cfg: R2Config,
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  await request(cfg, "PUT", key, { headers: { "content-type": contentType }, body });
}

/** Permanently deletes an object. */
export async function deleteObject(cfg: R2Config, key: string): Promise<void> {
  await request(cfg, "DELETE", key);
}

/** The bucket's CORS configuration XML, or null when none is set. */
export async function getBucketCors(cfg: R2Config): Promise<string | null> {
  try {
    const res = await request(cfg, "GET", null, { query: { cors: "" } });
    return await res.text();
  } catch (err) {
    if (err instanceof R2Error && (err.status === 404 || err.code === "NoSuchCORSConfiguration")) return null;
    throw err;
  }
}

/** Replaces the bucket's CORS configuration. Needs an R2 token with bucket (admin) write access. */
export async function putBucketCors(cfg: R2Config, xml: string): Promise<void> {
  const md5 = createHash("md5").update(xml).digest("base64");
  const headers = { "content-md5": md5, "content-type": "application/xml" };
  await request(cfg, "PUT", null, { query: { cors: "" }, headers, body: xml });
}

/** Lists at most one object (a cheap permission check). */
export async function probeList(cfg: R2Config, prefix = ""): Promise<void> {
  await request(cfg, "GET", null, { query: { "list-type": "2", prefix, "max-keys": "1" } });
}

/** Where each R2 setting comes from (variable names only, never values). */
export function describeOperationsR2Env(): {
  endpointVar: string | null;
  accessKeyVar: string | null;
  secretVar: string | null;
  bucketVar: string | null;
  jurisdictionVar: string | null;
} {
  const pick = (pairs: [string, string | undefined][]) => pairs.find(([, v]) => present(v))?.[0] ?? null;
  return {
    endpointVar: pick([
      ["OPERATIONS_R2_ENDPOINT", process.env.OPERATIONS_R2_ENDPOINT],
      ["OPERATIONS_R2_ACCOUNT_ID", process.env.OPERATIONS_R2_ACCOUNT_ID],
      ["R2_ACCOUNT_ID", process.env.R2_ACCOUNT_ID],
    ]),
    accessKeyVar: pick([
      ["OPERATIONS_R2_ACCESS_KEY_ID", process.env.OPERATIONS_R2_ACCESS_KEY_ID],
      ["R2_ACCESS_KEY_ID", process.env.R2_ACCESS_KEY_ID],
    ]),
    secretVar: pick([
      ["OPERATIONS_R2_SECRET_ACCESS_KEY", process.env.OPERATIONS_R2_SECRET_ACCESS_KEY],
      ["R2_SECRET_ACCESS_KEY", process.env.R2_SECRET_ACCESS_KEY],
    ]),
    bucketVar: pick([["OPERATIONS_R2_BUCKET", process.env.OPERATIONS_R2_BUCKET]]),
    jurisdictionVar: pick([["OPERATIONS_R2_JURISDICTION", process.env.OPERATIONS_R2_JURISDICTION]]),
  };
}
