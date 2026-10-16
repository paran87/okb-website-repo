"use client";

import { FileDown, Info, MapPin } from "lucide-react";
import type { VisibleRegion } from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData } from "@/features/accomplishment/types";
import { printRegionsPdf } from "@/components/public/accomplishment-live/region-pdf";
import type { Selection } from "@/components/public/accomplishment-live/regions";
import { Meter, pctText, recordProgress } from "@/components/public/accomplishment-live/shared";
import type { RecordType } from "@/features/accomplishment/lib/rollup";
import { regionLabel } from "@/features/accomplishment/lib/rollup";

/** The waterways and drainages of one region, opened under its row; each opens on the map or in its details. */
export function RegionDropdown({
  region,
  scale,
  types,
  onMap,
  onInfo,
}: {
  region: VisibleRegion;
  scale: AccomplishmentData["scale"];
  types: RecordType[];
  onMap: (name: string) => void;
  onInfo: (sel: Selection) => void;
}) {
  const code = regionLabel(region).code;
  return (
    <div className="mb-1 ml-1 overflow-hidden rounded-xl border border-[var(--dpwh-border)] bg-white sm:ml-7">
      <div className="flex items-center justify-between gap-2 border-b border-[#e3e8ef] bg-[#f6f8fb] px-3 py-1.5">
        <p className="text-[11px] font-semibold text-[var(--dpwh-muted)]">
          {region.ways.length} record{region.ways.length === 1 ? "" : "s"} · tap one to see it on the map
        </p>
        <button type="button" onClick={() => printRegionsPdf([region], scale, types)} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-[var(--dpwh-blue)] hover:bg-white">
          <FileDown className="size-4" aria-hidden /> PDF
        </button>
      </div>
      <div className="max-h-[26rem] overflow-y-auto overscroll-contain">
        {region.sites.map((s) => (
          <section key={s.n}>
            <h4 className="sticky top-0 z-10 border-b border-[#e3e8ef] bg-[#eef3f9] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--dpwh-blue-dark)]">
              {s.n} <span className="font-semibold normal-case tracking-normal text-[var(--dpwh-muted)]">· {s.w.length}</span>
            </h4>
            <ul className="divide-y divide-[#eef1f5]">
              {s.w.map((w) => {
                const pct = recordProgress(w, scale);
                return (
                  <li key={w.n} className="flex items-stretch">
                    <button type="button" onClick={() => onMap(w.n)} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left hover:bg-[#f3f6fa]">
                      <MapPin className="size-4 shrink-0 text-[var(--dpwh-orange)]" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--dpwh-text)]">{w.n}</span>
                        <span className="block truncate text-[11px] text-[var(--dpwh-muted)]">{[w.x?.city, w.o].filter(Boolean).join(" · ")}</span>
                        <Meter pct={pct} className="mt-1 h-1" />
                      </span>
                      <span className="w-11 shrink-0 text-right font-display text-base font-bold tabular-nums text-[var(--dpwh-blue-dark)]">{pctText(pct, 0)}</span>
                    </button>
                    <button type="button" onClick={() => onInfo({ record: w, region: code, site: s.n })} aria-label={`Details of ${w.n}`} className="grid w-11 shrink-0 place-items-center border-l border-[#eef1f5] text-[var(--dpwh-blue)] hover:bg-[#f3f6fa]">
                      <Info className="size-4" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
