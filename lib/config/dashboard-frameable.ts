import "server-only";

/** How often to re-check whether Google allows the dashboard to be framed. */
const RECHECK_SECONDS = 300;

const CHECK_TIMEOUT_MS = 5000;

/**
 * Apps Script web apps are only embeddable when `doGet` opts in with
 * `setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)`; otherwise
 * Google sends `X-Frame-Options: SAMEORIGIN` and browsers render a "refused to
 * connect" page inside the iframe. Proxying the wrapper through our origin does
 * not help either — it loads its runtime from root-relative `/static/...` URLs
 * that only exist on script.google.com.
 *
 * Checking the header server-side lets the page embed the dashboard when Google
 * allows it and fall back to a direct link when it does not. Anything other
 * than an explicit frame block or a sign-in redirect (network error, timeout,
 * transient 5xx) optimistically keeps the embed.
 */
export async function isDashboardFrameable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "text/html,application/xhtml+xml" },
      next: { revalidate: RECHECK_SECONDS },
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    });
    await response.body?.cancel();

    if (new URL(response.url).hostname === "accounts.google.com") return false;

    const frameOptions = response.headers.get("x-frame-options");
    if (!frameOptions) return true;
    return frameOptions.trim().toUpperCase() === "ALLOWALL";
  } catch {
    return true;
  }
}
