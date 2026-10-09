import "server-only";
import { createHash, createHmac } from "node:crypto";

/**
 * Minimal Cloudflare R2 (S3 API) client: list, presigned GET, move
 * (copy + delete). Requests are signed with AWS Signature V4 using
 * query-string auth, so the same signer serves server-side calls and the
 * short-lived links handed to the browser. Credentials stay on the server.
 */

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export interface R2Object {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
}

function env(...names: string[]): string | null {
  for (const name of names) {
    const v = process.env[name];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

/** The operations media bucket, or null when R2 is not configured on the server. */
export function getOperationsR2Config(): R2Config | null {
  const accountId = env("OPERATIONS_R2_ACCOUNT_ID", "R2_ACCOUNT_ID");
  const accessKeyId = env("OPERATIONS_R2_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID");
  const secretAccessKey = env("OPERATIONS_R2_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY");
  const bucket = env("OPERATIONS_R2_BUCKET") ?? "okb-whatsapp-bridge-bucket";
  if (!accountId || !accessKeyId || !secretAccessKey) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

const sha256 = (data: string) => createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();

/** RFC 3986 encoding as S3 expects (keeps "/" in object paths when asked). */
function encode(value: string, keepSlash = false): string {
  const out = encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
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
  opts: { query?: Record<string, string>; headers?: Record<string, string>; expiresIn?: number; at?: Date } = {},
): string {
  const host = `${cfg.accountId}.r2.cloudflarestorage.com`;
  const path = `/${encode(cfg.bucket)}${key !== null ? `/${encode(key, true)}` : ""}`;
  // A fixed signing time gives the same link on every request (the browser keeps the image cached).
  const now = opts.at ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const day = amzDate.slice(0, 8);
  const scope = `${day}/auto/s3/aws4_request`;

  const headers: Record<string, string> = { host };
  for (const [k, v] of Object.entries(opts.headers ?? {})) headers[k.toLowerCase()] = v.trim();
  const headerNames = Object.keys(headers).sort();
  const signedHeaders = headerNames.join(";");

  const query: Record<string, string> = {
    ...opts.query,
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${cfg.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(opts.expiresIn ?? 300),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${encode(k)}=${encode(query[k] ?? "")}`)
    .join("&");
  const canonicalHeaders = headerNames.map((h) => `${h}:${headers[h]}\n`).join("");
  const canonicalRequest = [method, path, canonicalQuery, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");

  const kDate = hmac(`AWS4${cfg.secretAccessKey}`, day);
  const kSigning = hmac(hmac(hmac(kDate, "auto"), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export class R2Error extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "R2Error";
  }
}

async function send(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok && res.status !== 206) {
    const body = await res.text().catch(() => "");
    const code = /<Code>([^<]+)<\/Code>/.exec(body)?.[1] ?? res.statusText;
    throw new R2Error(`R2 request failed (${res.status} ${code})`, res.status);
  }
  return res;
}

function xmlValue(block: string, tag: string): string {
  const raw = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(block)?.[1] ?? "";
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Every object under `prefix` (follows continuation tokens). */
export async function listObjects(cfg: R2Config, prefix: string): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let token: string | null = null;
  do {
    const query: Record<string, string> = { "list-type": "2", prefix, "max-keys": "1000" };
    if (token) query["continuation-token"] = token;
    const xml = await (await send(presign(cfg, "GET", null, { query }))).text();
    for (const [, block] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      if (!block) continue;
      objects.push({
        key: xmlValue(block, "Key"),
        size: Number(xmlValue(block, "Size")) || 0,
        lastModified: xmlValue(block, "LastModified"),
        etag: xmlValue(block, "ETag").replace(/"/g, ""),
      });
    }
    token = xmlValue(xml, "IsTruncated") === "true" ? xmlValue(xml, "NextContinuationToken") || null : null;
  } while (token);
  return objects;
}

/** The first [bytes] bytes of an object (for reading a photo's EXIF without downloading it). */
export async function readStart(cfg: R2Config, key: string, bytes: number): Promise<Uint8Array> {
  const range = `bytes=0-${bytes - 1}`;
  const res = await send(presign(cfg, "GET", key), { headers: { Range: range }, signal: AbortSignal.timeout(8000) });
  return new Uint8Array(await res.arrayBuffer());
}

/** Moves an object to another key (copy, then delete the original). */
export async function moveObject(cfg: R2Config, from: string, to: string): Promise<void> {
  const copySource = `/${encode(cfg.bucket)}/${encode(from, true)}`;
  await send(presign(cfg, "PUT", to, { headers: { "x-amz-copy-source": copySource } }), {
    method: "PUT",
    headers: { "x-amz-copy-source": copySource },
  });
  await send(presign(cfg, "DELETE", from), { method: "DELETE" });
}
