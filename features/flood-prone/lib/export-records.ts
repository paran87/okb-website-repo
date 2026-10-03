import type { NcrCriticalAreaRecord } from "@/features/flood-prone/types";

const HEADERS = [
  "Region",
  "Province",
  "Municipality/City",
  "Barangay / Location",
  "Road / Waterway",
  "DEO",
  "Status",
  "Latitude",
  "Longitude",
] as const;

function row(r: NcrCriticalAreaRecord): string[] {
  return [
    r.region,
    r.province,
    r.municipality,
    r.location,
    r.road,
    r.deo,
    r.status === "located" ? "Located" : "Needs review",
    r.latitude?.toFixed(5) ?? "",
    r.longitude?.toFixed(5) ?? "",
  ];
}

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportRecordsCsv(records: NcrCriticalAreaRecord[]): void {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [HEADERS.map(escape), ...records.map((r) => row(r).map(escape))];
  download(
    "ncr-critical-areas.csv",
    `﻿${lines.map((l) => l.join(",")).join("\r\n")}`,
    "text/csv;charset=utf-8",
  );
}

const html = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Opens a print-ready table; the browser's print dialog saves it as PDF. */
export function exportRecordsPdf(records: NcrCriticalAreaRecord[]): void {
  const win = window.open("", "_blank");
  if (!win) return;
  const head = HEADERS.slice(0, 7)
    .map((h) => `<th>${h}</th>`)
    .join("");
  const body = records
    .map(
      (r) =>
        `<tr>${row(r)
          .slice(0, 7)
          .map((c) => `<td>${html(c)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>NCR Critical Areas</title>
<style>body{font:12px system-ui,sans-serif;margin:24px}h1{font-size:16px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left;vertical-align:top}
th{background:#0f2a6b;color:#fff}thead{display:table-header-group}tr{break-inside:avoid}</style></head>
<body><h1>NCR Critical Areas — ${records.length} records</h1>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`);
  win.document.close();
}
