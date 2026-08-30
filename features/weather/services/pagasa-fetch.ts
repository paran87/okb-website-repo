import https from "node:https";
import tls from "node:tls";

const USER_AGENT = "OKB-Command-Center/1.0 (+https://pagasa.dost.gov.ph)";
const REQUEST_TIMEOUT_MS = 45_000;

/** HTTPS fetch that trusts the OS certificate store (required for PAGASA on Windows Node). */
export async function pagasaFetchText(url: string): Promise<{
  ok: boolean;
  status: number;
  text: string;
}> {
  try {
    const text = await pagasaRequest(url);
    return { ok: true, status: 200, text };
  } catch {
    return { ok: false, status: 502, text: "" };
  }
}

export async function pagasaFetchJson<T>(url: string): Promise<T | null> {
  try {
    const text = await pagasaRequest(url);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
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
        ca: tls.getCACertificates("system"),
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
