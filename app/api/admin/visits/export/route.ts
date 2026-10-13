import type { NextRequest } from "next/server";
import { toErrorResponse } from "@/lib/api/response";
import { parseArea, parseRange } from "@/features/admin/server/params";
import { requireAdmin } from "@/features/admin/server/session";
import { exportVisits } from "@/features/admin/server/visits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MANILA = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function cell(value: string | number | boolean | null): string {
  const text = value === null ? "" : String(value);
  // Quote everything; neutralise spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** The visit log of the range as CSV (Philippine time). */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    requireAdmin(request);
    const params = request.nextUrl.searchParams;
    const range = parseRange(params.get("range"));
    const rows = await exportVisits({
      range,
      area: parseArea(params.get("area")),
      search: params.get("q")?.slice(0, 80) ?? null,
    });
    const header = [
      "Date and time (PHT)",
      "Area",
      "Page",
      "Page title",
      "City",
      "Region",
      "Country",
      "Device",
      "Browser",
      "OS",
      "Screen",
      "Language",
      "Came from",
      "Visitor",
      "New visitor",
    ];
    const lines = rows.map((r) =>
      [
        MANILA.format(new Date(r.occurredAt)).replace(",", ""),
        r.area === "command" ? "Command Center" : "Website",
        r.path,
        r.pageTitle,
        r.city,
        r.region,
        r.country,
        r.device,
        r.browser,
        r.os,
        r.screen,
        r.language,
        r.referrerHost ?? "Direct",
        r.visitorId.slice(0, 8),
        r.isNewVisitor ? "yes" : "no",
      ]
        .map(cell)
        .join(","),
    );
    const csv = `﻿${[header.map(cell).join(","), ...lines].join("\r\n")}\r\n`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="okb-visits-${range}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
