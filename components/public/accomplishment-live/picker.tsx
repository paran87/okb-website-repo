"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { recordType, type RecordType } from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData, AccomplishmentRecord } from "@/features/accomplishment/types";
import { RowIcon } from "@/components/public/accomplishment-live/region-dropdown";
import { Meter, pctText, recordProgress } from "@/components/public/accomplishment-live/shared";
import { cn } from "@/utils/cn";

export type RegionSort = "progress" | "order";

export interface PickerItem {
  record: AccomplishmentRecord;
  region: string;
  site: string;
  regionKey: string;
}

/** Progress ranking or the natural CAR to Region XIII arrangement. */
export function RegionSortToggle({ value, onChange }: { value: RegionSort; onChange: (v: RegionSort) => void }) {
  const options: { value: RegionSort; label: string }[] = [
    { value: "progress", label: "By progress" },
    { value: "order", label: "CAR → XIII" },
  ];
  return (
    <div className="flex rounded-lg bg-[#eef1f5] p-0.5 text-[11px] font-bold" role="group" aria-label="Region order">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn("h-9 whitespace-nowrap rounded-md px-2.5 transition-colors", value === o.value ? "bg-[var(--dpwh-blue-dark)] text-white" : "text-[var(--dpwh-muted)] hover:text-[var(--dpwh-blue-dark)]")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const TYPE_WORD: Record<RecordType, string> = { waterway: "Waterway", drainage: "Drainage", isf: "ISF" };

/**
 * Search box with a dropdown of every waterway / drainage the type chips allow, grouped by region from CAR to XIII.
 * Tapping a row opens its details (map, progress and photos).
 */
export function WaterwayPicker({
  items,
  types,
  scale,
  onInfo,
}: {
  items: PickerItem[];
  types: RecordType[];
  scale: AccomplishmentData["scale"];
  onInfo: (item: PickerItem) => void;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const q = text.trim().toLowerCase();
  const groups = useMemo(() => {
    const out: { key: string; code: string; rows: PickerItem[] }[] = [];
    for (const it of items) {
      if (!types.includes(recordType(it.record))) continue;
      const w = it.record;
      if (q && ![w.n, it.site, it.region, w.o, w.x?.city ?? "", w.x?.q ?? ""].some((t) => t.toLowerCase().includes(q))) continue;
      let g = out[out.length - 1];
      if (!g || g.key !== it.regionKey) {
        g = { key: it.regionKey, code: it.region, rows: [] };
        out.push(g);
      }
      g.rows.push(it);
    }
    return out;
  }, [items, types, q]);
  const count = groups.reduce((n, g) => n + g.rows.length, 0);
  const what = types.length === 1 && types[0] ? `${TYPE_WORD[types[0]].toLowerCase()}s` : "waterways and drainages";

  const pick = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={box} className="relative md:flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--dpwh-muted)]" aria-hidden />
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="okb-picker-list"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Find a waterway or drainage"
        aria-label="Find a waterway, site, city or region"
        className="h-11 w-full rounded-lg border border-[var(--dpwh-border)] bg-white pl-9 pr-20 text-sm text-[var(--dpwh-text)] outline-none focus:border-[var(--dpwh-blue)] focus:ring-2 focus:ring-[var(--dpwh-blue)]/20"
      />
      <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
        {text ? (
          <button type="button" onClick={() => setText("")} aria-label="Clear search" className="grid size-9 place-items-center rounded-md text-[var(--dpwh-muted)]">
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close the list" : "Open the list"} className="grid size-9 place-items-center rounded-md text-[var(--dpwh-blue-dark)]">
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </div>

      {open ? (
        <div id="okb-picker-list" className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-[var(--dpwh-border)] bg-white shadow-xl">
          <p className="border-b border-[#e3e8ef] bg-[#f6f8fb] px-3 py-2 text-[11px] font-semibold text-[var(--dpwh-muted)]">
            {count} {what}
            {q ? ` matching “${text.trim()}”` : ""} · tap one for its details, map and photos
          </p>
          <div className="max-h-[min(60vh,28rem)] overflow-y-auto overscroll-contain">
            {groups.length ? (
              groups.map((g) => (
                <section key={g.key}>
                  <h3 className="sticky top-0 z-10 border-b border-[#e3e8ef] bg-[#eef3f9] px-3 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-[var(--dpwh-blue-dark)]">
                    {g.code} <span className="font-sans text-[11px] font-semibold normal-case tracking-normal text-[var(--dpwh-muted)]">· {g.rows.length}</span>
                  </h3>
                  <ul className="divide-y divide-[#eef1f5]">
                    {g.rows.map((it) => {
                      const pct = recordProgress(it.record, scale);
                      return (
                        <li key={`${it.site}|${it.record.n}`} className="flex items-stretch">
                          <button type="button" onClick={() => pick(() => onInfo(it))} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left hover:bg-[#f3f6fa]">
                            <RowIcon type={recordType(it.record)} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-[var(--dpwh-text)]">{it.record.n}</span>
                              <span className="block truncate text-[11px] text-[var(--dpwh-muted)]">{[it.site, it.record.x?.city].filter(Boolean).join(" · ")}</span>
                              <Meter pct={pct} className="mt-1 h-1" />
                            </span>
                            <span className="w-11 shrink-0 text-right font-display text-base font-bold tabular-nums text-[var(--dpwh-blue-dark)]">{pctText(pct, 0)}</span>
                            <ChevronRight className="size-4 shrink-0 text-[var(--dpwh-muted)]" aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            ) : (
              <p className="px-3 py-6 text-center text-sm text-[var(--dpwh-muted)]">Nothing found. Try another name or turn on more chips.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
