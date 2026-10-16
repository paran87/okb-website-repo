import { recordPct, recordType, regionLabel, WORK_STATUS, workStatus, type RecordType, type VisibleRegion } from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData } from "@/features/accomplishment/types";

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const num = (n: number | null) => (n === null ? "—" : Math.round(n).toLocaleString("en-US"));
const TYPE_WORD: Record<RecordType, string> = { waterway: "Waterways", drainage: "Drainage", isf: "ISF" };

/** Opens a print-ready list of the regions; the browser's print dialog saves it as PDF. */
export function printRegionsPdf(regions: VisibleRegion[], scale: AccomplishmentData["scale"], types: RecordType[]): void {
  const win = window.open("", "_blank");
  if (!win) return;
  const filter = types.map((t) => TYPE_WORD[t]).join(" + ");
  const count = regions.reduce((n, r) => n + r.ways.length, 0);
  const title = regions.length === 1 ? `OKB Accomplishment — ${regionLabel(regions[0]!).code}` : "OKB Accomplishment — all regions";
  const body = regions
    .map((r) => {
      const label = regionLabel(r);
      const rows = r.sites
        .flatMap((s) =>
          s.w.map((w) => {
            const pct = recordPct(w, scale);
            return `<tr><td>${esc(w.n)}</td><td>${esc(s.n)}${w.x?.city ? ` · ${esc(w.x.city)}` : ""}</td><td>${recordType(w) === "isf" ? "ISF" : recordType(w) === "drainage" ? "Drainage" : "Waterway"}</td><td>${WORK_STATUS[workStatus(w, scale)].label}</td><td class="n">${num(w.p)}</td><td class="n">${num(w.v)}</td><td class="n">${pct === null ? "—" : `${pct.toFixed(0)}%`}</td></tr>`;
          }),
        )
        .join("");
      return `<h2>${esc(label.code)}${label.name ? ` · ${esc(label.name)}` : ""} <small>${r.pct === null ? "—" : `${r.pct.toFixed(1)}%`} · ${r.ways.length} record${r.ways.length === 1 ? "" : "s"}</small></h2>
<table><thead><tr><th>Name</th><th>Site</th><th>Type</th><th>Status</th><th>Planned m³</th><th>Done m³</th><th>Progress</th></tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join("");
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font:11px system-ui,sans-serif;margin:20px;color:#0f172a}h1{font-size:16px;margin:0}p{margin:2px 0 12px;color:#475569}
h2{font-size:13px;margin:16px 0 4px;color:#0f2a6b;break-after:avoid}h2 small{font-weight:400;color:#475569}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:3px 5px;text-align:left;vertical-align:top}
th{background:#0f2a6b;color:#fff}td.n{text-align:right}thead{display:table-header-group}tr{break-inside:avoid}</style></head>
<body><h1>Oplan Kontra Baha — dredging, desilting and declogging</h1>
<p>${esc(filter)} · ${count} records · generated ${new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}</p>${body}
<script>window.onload=function(){window.print()}</script></body></html>`);
  win.document.close();
}
