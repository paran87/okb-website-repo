"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Droplets, Home, Search, Shovel, Waves, X, type LucideIcon } from "lucide-react";
import {
  compactVolume,
  recordType,
  regionLabel,
  statusCounts,
  volumeTotals,
  WORK_STATUS_ORDER,
  workStatus,
  type RecordType,
  type VisibleRegion,
  type WorkStatus,
} from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData } from "@/features/accomplishment/types";
import { RecordRow, type Selection } from "@/components/public/accomplishment-live/regions";
import { Empty, Meter, Panel, STATUS } from "@/components/public/accomplishment-live/shared";
import { cn } from "@/utils/cn";

export type InsightKind = "volume" | "status" | "records";

type Scale = AccomplishmentData["scale"];

interface Row extends Selection {
  regionKey: string;
}

function rowsOf(tree: VisibleRegion[]): Row[] {
  return tree.flatMap((r) => r.sites.flatMap((s) => s.w.map((w) => ({ record: w, region: regionLabel(r).code, site: s.n, regionKey: r.key }))));
}

const TITLES: Record<InsightKind, { title: string; lead: string }> = {
  volume: { title: "Silt removed", lead: "Volume of silt and debris removed against what is planned, by region and by waterway." },
  status: { title: "Completed and ongoing work", lead: "Every record by where its work stands. Tap a tab, then a waterway for its details." },
  records: { title: "All records", lead: "Every waterway, drainage line and ISF record in the program. Search or filter by type." },
};

function Header({ kind, onBack }: { kind: InsightKind; onBack: () => void }) {
  const t = TITLES[kind];
  return (
    <div className="flex items-start gap-3">
      <button type="button" onClick={onBack} className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--dpwh-border)] bg-white px-3 text-sm font-bold text-[var(--dpwh-blue-dark)] hover:border-[var(--dpwh-blue)]">
        <ArrowLeft className="size-4" aria-hidden /> Overview
      </button>
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-bold uppercase leading-tight tracking-wide text-[var(--dpwh-blue-dark)]">{t.title}</h2>
        <p className="text-sm text-[var(--dpwh-muted)]">{t.lead}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ volume */

function VolumeView({ tree, onOpen }: { tree: VisibleRegion[]; onOpen: (s: Selection) => void }) {
  const rows = useMemo(() => rowsOf(tree), [tree]);
  const all = useMemo(() => volumeTotals(rows.map((r) => r.record)), [rows]);
  const byRegion = useMemo(
    () =>
      tree
        .map((r) => ({ key: r.key, code: regionLabel(r).code, ...volumeTotals(r.ways) }))
        .filter((r) => r.acc > 0 || r.plan > 0)
        .sort((a, b) => b.acc - a.acc),
    [tree],
  );
  const top = useMemo(() => rows.filter((r) => (r.record.v ?? 0) > 0).sort((a, b) => (b.record.v ?? 0) - (a.record.v ?? 0)).slice(0, 25), [rows]);
  const maxAcc = byRegion[0]?.acc || 1;
  const maxTop = top[0]?.record.v || 1;
  const reporting = rows.filter((r) => (r.record.v ?? 0) > 0).length;
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="okb-live-band relative isolate overflow-hidden rounded-2xl p-4 text-white lg:col-span-12">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--dpwh-gold)]">
          <Shovel className="size-4" aria-hidden /> Silt removed
        </p>
        <p className="mt-1 font-display text-5xl font-bold leading-none">
          {compactVolume(all.acc)} <span className="text-lg font-semibold text-white/70">m³</span>
        </p>
        <p className="mt-1.5 text-sm text-white/80">
          of {compactVolume(all.plan)} m³ planned · {reporting} of {rows.length} records reporting
        </p>
        <Meter pct={all.plan ? (100 * all.acc) / all.plan : null} tone="light" className="mt-3 h-2.5" />
      </div>
      <Panel title="By region" icon={Shovel} className="lg:col-span-5" bodyClassName="p-3">
        <ul className="space-y-2.5">
          {byRegion.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-display text-base font-bold uppercase tracking-wide text-[var(--dpwh-blue-dark)]">{r.code}</span>
                <span className="text-xs text-[var(--dpwh-muted)]">
                  <span className="font-semibold text-[var(--dpwh-text)]">{compactVolume(r.acc)}</span> of {compactVolume(r.plan)} m³
                </span>
              </div>
              <span className="relative mt-1 block h-2.5 overflow-hidden rounded-full bg-[#d7dee8]">
                <span className="absolute inset-y-0 left-0 rounded-full bg-[#9db9e8]" style={{ width: `${Math.min(100, (100 * r.plan) / Math.max(maxAcc, r.plan))}%` }} />
                <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--dpwh-blue)]" style={{ width: `${Math.min(100, (100 * r.acc) / Math.max(maxAcc, r.plan))}%` }} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-[var(--dpwh-muted)]">Dark bar: removed · light bar: planned.</p>
      </Panel>
      <Panel title="Top waterways by silt removed" icon={Waves} className="lg:col-span-7" bodyClassName="p-0">
        <ul className="divide-y divide-[#eef1f5]">
          {top.map((t) => (
            <li key={`${t.regionKey}|${t.site}|${t.record.n}`}>
              <button type="button" onClick={() => onOpen(t)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left hover:bg-[#f3f6fa]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--dpwh-text)]">{t.record.n}</span>
                  <span className="block truncate text-xs text-[var(--dpwh-muted)]">{[t.region, t.site].join(" · ")}</span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-[#d7dee8]">
                    <span className="block h-full rounded-full bg-[var(--dpwh-blue)]" style={{ width: `${(100 * (t.record.v ?? 0)) / maxTop}%` }} />
                  </span>
                </span>
                <span className="shrink-0 text-right font-display text-lg font-bold tabular-nums text-[var(--dpwh-blue-dark)]">
                  {compactVolume(t.record.v ?? 0)}
                  <span className="ml-0.5 text-xs font-semibold text-[var(--dpwh-muted)]">m³</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------- list views */

const PAGE = 60;

function RecordList({ rows, scale, onOpen, empty }: { rows: Row[]; scale: Scale; onOpen: (s: Selection) => void; empty: string }) {
  const [shown, setShown] = useState(PAGE);
  const visible = rows.slice(0, shown);
  if (!rows.length) return <Empty>{empty}</Empty>;
  // Grouped by region in the order the rows arrive (CAR to XIII).
  const groups: { key: string; code: string; rows: Row[] }[] = [];
  for (const r of visible) {
    let g = groups[groups.length - 1];
    if (!g || g.key !== r.regionKey) {
      g = { key: r.regionKey, code: r.region, rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
  }
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--dpwh-border)] bg-white">
      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="border-b border-[#e3e8ef] bg-[var(--dpwh-blue-dark)] px-3 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-white">
            {g.code} <span className="font-sans text-[11px] font-semibold normal-case tracking-normal text-[var(--dpwh-gold)]">· {g.rows.length}</span>
          </h3>
          <ul className="divide-y divide-[#eef1f5]">
            {g.rows.map((r) => (
              <li key={`${r.regionKey}|${r.site}|${r.record.n}`}>
                <RecordRow w={r.record} scale={scale} sub={[r.site, r.record.x?.city].filter(Boolean).join(" · ")} onOpen={() => onOpen(r)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
      {rows.length > shown ? (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="h-12 w-full border-t border-[#e3e8ef] text-sm font-bold text-[var(--dpwh-blue)]">
          Show more ({rows.length - shown} left)
        </button>
      ) : null}
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--dpwh-muted)]" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name, site, city or region"
        aria-label="Search the list"
        className="h-11 w-full rounded-lg border border-[var(--dpwh-border)] bg-white pl-9 pr-10 text-sm outline-none focus:border-[var(--dpwh-blue)] focus:ring-2 focus:ring-[var(--dpwh-blue)]/20 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-[var(--dpwh-muted)]">
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </label>
  );
}

const matches = (r: Row, q: string) => !q || [r.record.n, r.site, r.region, r.record.o, r.record.x?.city ?? ""].some((t) => t.toLowerCase().includes(q));

function StatusView({ tree, scale, onOpen }: { tree: VisibleRegion[]; scale: Scale; onOpen: (s: Selection) => void }) {
  const rows = useMemo(() => rowsOf(tree), [tree]);
  const counts = useMemo(() => statusCounts(rows.map((r) => r.record), scale), [rows, scale]);
  const [tab, setTab] = useState<WorkStatus>(counts.done ? "done" : "ongoing");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => workStatus(r.record, scale) === tab && matches(r, needle));
  }, [rows, scale, tab, q]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="tablist" aria-label="Status">
        {WORK_STATUS_ORDER.map((s) => {
          const st = STATUS[s];
          const Icon = st.icon;
          const on = tab === s;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(s)}
              className={cn("flex min-h-16 items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left transition-colors", on ? "bg-white shadow-sm" : "border-transparent bg-white/70 hover:bg-white")}
              style={on ? { borderColor: st.color } : undefined}
            >
              <Icon className="size-5 shrink-0" style={{ color: st.color }} aria-hidden />
              <span className="min-w-0">
                <span className="block font-display text-2xl font-bold leading-none text-[var(--dpwh-blue-dark)]">{counts[s]}</span>
                <span className="block truncate text-xs font-semibold text-[var(--dpwh-muted)]">{st.label}</span>
              </span>
            </button>
          );
        })}
      </div>
      <SearchBox value={q} onChange={setQ} />
      <RecordList key={`${tab}|${q}`} rows={list} scale={scale} onOpen={onOpen} empty="Nothing in this group." />
    </div>
  );
}

const TYPE_TABS: { id: RecordType | "all"; label: string; icon: LucideIcon | null }[] = [
  { id: "all", label: "All", icon: null },
  { id: "waterway", label: "Waterways", icon: Waves },
  { id: "drainage", label: "Drainage", icon: Droplets },
  { id: "isf", label: "ISF", icon: Home },
];

function RecordsView({ tree, scale, onOpen }: { tree: VisibleRegion[]; scale: Scale; onOpen: (s: Selection) => void }) {
  const rows = useMemo(() => rowsOf(tree), [tree]);
  const [tab, setTab] = useState<RecordType | "all">("all");
  const [q, setQ] = useState("");
  const counts = useMemo(() => {
    const c = { all: rows.length, waterway: 0, drainage: 0, isf: 0 };
    for (const r of rows) c[recordType(r.record)]++;
    return c;
  }, [rows]);
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => (tab === "all" || recordType(r.record) === tab) && matches(r, needle));
  }, [rows, tab, q]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-[var(--dpwh-border)] bg-white p-1" role="tablist" aria-label="Record type">
        {TYPE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[12px] font-bold leading-tight sm:flex-row sm:gap-1.5 sm:text-sm", tab === id ? "bg-[var(--dpwh-blue-dark)] text-white shadow-[inset_0_-3px_0_var(--dpwh-orange)]" : "text-[var(--dpwh-blue-dark)] hover:bg-[var(--dpwh-blue-light)]")}
          >
            {Icon ? <Icon className={cn("size-4", tab === id ? "text-[var(--dpwh-gold)]" : "text-[var(--dpwh-orange)]")} aria-hidden /> : null}
            <span>{label}</span>
            <span className="tabular-nums opacity-80">{counts[id]}</span>
          </button>
        ))}
      </div>
      <SearchBox value={q} onChange={setQ} />
      <RecordList key={`${tab}|${q}`} rows={list} scale={scale} onOpen={onOpen} empty="No records match." />
    </div>
  );
}

/** A detail page behind one of the headline figures. */
export function InsightView({
  kind,
  chipTree,
  allTree,
  scale,
  onBack,
  onOpen,
}: {
  kind: InsightKind;
  /** Regions and records as the type chips filter them (what the figures count). */
  chipTree: VisibleRegion[];
  /** Every record, whatever the chips say. */
  allTree: VisibleRegion[];
  scale: Scale;
  onBack: () => void;
  onOpen: (s: Selection) => void;
}) {
  return (
    <div className="space-y-4">
      <Header kind={kind} onBack={onBack} />
      {kind === "volume" ? <VolumeView tree={chipTree} onOpen={onOpen} /> : null}
      {kind === "status" ? <StatusView tree={chipTree} scale={scale} onOpen={onOpen} /> : null}
      {kind === "records" ? <RecordsView tree={allTree} scale={scale} onOpen={onOpen} /> : null}
    </div>
  );
}

