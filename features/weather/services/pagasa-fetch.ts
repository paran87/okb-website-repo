import https from "node:https";
import tls from "node:tls";

const USER_AGENT = "OKB-Command-Center/1.0 (+https://pagasa.dost.gov.ph)";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;

/** HTTPS fetch that trusts the OS certificate store (required for PAGASA on Windows Node). */
export async function pagasaFetchText(url: string): Promise<{
  ok: boolean;
  status: number;
  text: string;
  error?: string;
}> {
  try {
    const text = await pagasaRequestWithRetry(url);
    return { ok: true, status: 200, text };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function pagasaFetchJson<T>(url: string): Promise<T | null> {
  try {
    const text = await pagasaRequestWithRetry(url);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Bundled Mozilla roots plus the OS store. Serverless hosts (e.g. Vercel) can
 * report an empty system store, which would make every request fail with a
 * certificate error if it were the only trust list.
 */
function trustedCertificates(): string[] {
  const certs = [...tls.rootCertificates];
  try {
    certs.push(...tls.getCACertificates("system"));
  } catch {
    // Older Node versions have no system store API; bundled roots suffice.
  }
  return certs;
}

async function pagasaRequestWithRetry(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await pagasaRequest(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function pagasaRequest(url: string): Promise<string> {
  const parsed = new URL(url);

  return new Promise((resolve, reject) => {
    const request = https.get(
      {
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json, text/html, */*",
        },
        ca: trustedCertificates(),
        rejectUnauthorized: true,
      },
      (response) => {
        let body = "";

        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () => {
          const status = response.statusCode ?? 500;
          if (status >= 400) {
            reject(new Error(`PAGASA request failed (${status}) for ${url}`));
            return;
          }
          resolve(body);
        });
      },
    );

    request.setTimeout(REQUEST_TIMEOUT_MS, () => {
      request.destroy(new Error(`PAGASA request timed out for ${url}`));
    });

    request.on("error", reject);
  });
}
