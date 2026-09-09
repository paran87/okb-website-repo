import { DREDGER_STATUS_DASHBOARD_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Google serves the dredger Apps Script wrapper with X-Frame-Options:
 * SAMEORIGIN, which blocks a direct iframe on the OKB site. Proxying through
 * our origin strips that upstream header so the nested googleusercontent frame
 * can still render the dashboard.
 */
export async function GET() {
  const upstream = await fetch(DREDGER_STATUS_DASHBOARD_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new Response("Unable to load the dredger status dashboard.", {
      status: upstream.status,
    });
  }

  const html = await upstream.text();

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
