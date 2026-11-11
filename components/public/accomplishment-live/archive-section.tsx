"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Download, Droplets, History, Home, Search, TrendingUp, Waves, type LucideIcon } from "lucide-react";
import type { RecordType, WorkStatus } from "@/features/accomplishment/lib/rollup";
import type { ArchiveChange, ArchivedState, ArchiveSnapshot } from "@/features/accomplishment/archive-types";
import { useArchive, type ArchiveDays } from "@/components/public/accomplishment-live/data";
import type { Selection } from "@/components/public/accomplishment-live/regions";
import { compact, dayText, Empty, int, km, Panel, pctText, STATUS } from "@/components/public/accomplishment-live/shared";
import { cn } from "@/utils/cn";

const PERIODS: { value: ArchiveDays; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: "all", label: "All" },
];
const KIND: Record<RecordType, { label: string; icon: LucideIcon; color: string }> = {
  waterway: { label: "Waterway", icon: Waves, color: "#0038a8" },
  drainage: { label: "Drainage", icon: Droplets, color: "#0d9488" },
  isf: { label: "ISF", icon: Home, color: "#6b7280" },
};
const LINE = "#1d4ed8";
const PAGE = 40;

/** Axis ticks with enough digits that a narrow range does not repeat a label ("2.15M", "2.18M"). */
const trim = (s: string) => (s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s);

function tickFormat(span: number) {
  return (v: number) => {
    if (v >= 1_000_000) return `${trim((v / 1_000_000).toFixed(span < 100_000 ? 3 : span < 1_000_000 ? 2 : 1))}M`;
    if (v >= 10_000) return `${trim((v / 1000).toFixed(span < 1000 ? 2 : span < 10_000 ? 1 : 0))}K`;
    return int(v);
  };
}

const delta = (a: number | null | undefined, b: number | null | undefined) => (a ?? 0) - (b ?? 0);
const signed = (n: number, unit = "") => `${n > 0 ? "+" : n < 0 ? "−" : ""}${int(Math.abs(n))}${unit}`;

/** Sum of the selected types' totals on one snapshot. */
function sumTotals(s: ArchiveSnapshot | undefined, kinds: RecordType[]) {
  const out = { accomplished: 0, done: 0, pointsCleaned: 0, records: 0 };
  if (!s) return out;
  for (const k of kinds) {
    const t = s.totals[k];
    if (!t) continue;
    out.accomplished += t.accomplished;
    out.done += t.done;
    out.pointsCleaned += t.pointsCleaned;
    out.records += t.records;
  }
  return out;
}

/** What a change shows: the volume now, its change, and short notes for status, progress, points, length and plan. */
function describe(c: ArchiveChange): { volume: number | null; added: number | null; notes: { text: string; status?: WorkStatus }[] } {
  const b: Partial<ArchivedState> = c.before ?? {};
  const a: Partial<ArchivedState> = c.after ?? {};
  const notes: { text: string; status?: WorkStatus }[] = [];
  if (c.change === "added") notes.push({ text: "New in the sheet" });
  if (c.change === "removed") notes.push({ text: "No longer in the sheet" });
  if (c.change === "update" && b.st && a.st && b.st !== a.st) notes.push({ text: `${STATUS[b.st].label} → ${STATUS[a.st].label}`, status: a.st });
  if (c.change === "update" && b.g !== a.g && (b.g !== null || a.g !== null)) notes.push({ text: `${pctText(b.g ?? null, 0)} → ${pctText(a.g ?? null, 0)}` });
  if (c.change === "update" && b.pc !== a.pc) notes.push({ text: `${signed(delta(a.pc, b.pc))} points cleaned` });
  if (c.change === "update" && b.tp !== a.tp) notes.push({ text: `Traced line ${int(b.tp ?? 0)} → ${int(a.tp ?? 0)} points` });
  if (c.change === "update" && b.al !== a.al) notes.push({ text: `${km(Math.max(0, a.al ?? 0))} cleaned (${delta(a.al, b.al) >= 0 ? "+" : "−"}${km(Math.abs(delta(a.al, b.al)))})` });
  if (c.change === "update" && b.p !== a.p) notes.push({ text: `Plan ${int(b.p ?? 0)} → ${int(a.p ?? 0)} m³` });
  const volume = c.change === "removed" ? (b.v ?? null) : (a.v ?? null);
  const added = c.change === "update" && b.v !== a.v ? delta(a.v, b.v) : null;
  return { volume, added, notes };
}

function toCsv(changes: ArchiveChange[]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["day", "type", "region", "site", "name", "change", "volume_before_m3", "volume_after_m3", "volume_change_m3", "status_before", "status_after", "progress_before_pct", "progress_after_pct", "points_cleaned_before", "points_cleaned_after", "points_total_after", "planned_before_m3", "planned_after_m3"];
  const rows = changes.map((c) => {
    const b = c.before;
    const a = c.after;
    return [c.day, c.kind, c.region, c.site, c.name, c.change, b?.v, a?.v, b && a ? delta(a.v, b.v) : "", b ? STATUS[b.st].label : "", a ? STATUS[a.st].label : "", b?.g, a?.g, b?.pc, a?.pc, a?.tp, b?.p, a?.p];
  });
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\n");
}

function downloadCsv(changes: ArchiveChange[]) {
  const blob = new Blob([`﻿${toCsv(changes)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `okb-accomplishment-archive-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-[#e3e8ef] bg-[#fbfcfe] px-3 py-2.5">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--dpwh-muted)]">{label}</p>
      <p className="mt-0.5 truncate font-display text-2xl font-bold leading-none text-[var(--dpwh-blue-dark)]">{value}</p>
      {hint ? <p className="mt-1 truncate text-[11px] text-[var(--dpwh-muted)]">{hint}</p> : null}
    </div>
  );
}

function ChangeCard({ c, onOpen }: { c: ArchiveChange; onOpen?: () => void }) {
  const { volume, added, notes } = describe(c);
  const kind = KIND[c.kind];
  const Icon = kind.icon;
  const Wrapper = (onOpen ? "button" : "div") as "button";
  return (
    <Wrapper
      {...(onOpen ? { type: "button" as const, onClick: onOpen } : {})}
      className={cn("block w-full rounded-xl border border-[#e3e8ef] bg-[#fbfcfe] p-3 text-left", onOpen && "hover:border-[#8fa3bf]", c.change === "removed" && "opacity-75")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: kind.color }}>
            <Icon className="size-3" aria-hidden /> {kind.label}
          </p>
          <p className="line-clamp-2 text-sm font-bold leading-snug text-[var(--dpwh-text)]">{c.name}</p>
          <p className="truncate text-xs text-[var(--dpwh-muted)]">{[c.region, c.site].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-bold leading-none text-[var(--dpwh-blue-dark)]">{volume !== null ? `${int(volume)} m³` : "—"}</p>
          {added !== null && added !== 0 ? <p className={cn("mt-0.5 text-xs font-bold", added > 0 ? "text-[#15803d]" : "text-[#b91c1c]")}>{signed(added, " m³")}</p> : null}
        </div>
      </div>
      {notes.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {notes.map((n) => (
            <span
              key={n.text}
              className="inline-flex min-h-6 items-center rounded-full px-2 text-[11px] font-semibold"
              style={n.status ? { color: STATUS[n.status].color, backgroundColor: STATUS[n.status].bg } : { color: "var(--dpwh-blue-dark)", backgroundColor: "var(--dpwh-blue-light)" }}
            >
              {n.text}
            </span>
          ))}
        </div>
      ) : null}
    </Wrapper>
  );
}

/**
 * The accomplishment archive: what changed on each waterway and drainage line, day by day, from the nightly
 * snapshots of the OKB SSOT sheet (features/accomplishment/server/archive.ts). Follows the type chips.
 */
export function ArchiveView({ types, records, onOpenRecord }: { types: RecordType[]; records: Selection[]; onOpenRecord: (sel: Selection) => void }) {
  const [days, setDays] = useState<ArchiveDays>(30);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const query = useArchive(days);
  const archive = query.data;

  const find = useMemo(() => {
    const byName = new Map<string, Selection>();
    for (const r of records) if (!byName.has(r.record.n)) byName.set(r.record.n, r);
    return (name: string) => byName.get(name) ?? null;
  }, [records]);

  const kinds = types;
  const snapshots = useMemo(() => archive?.snapshots ?? [], [archive]);
  const series = useMemo(() => {
    const inPeriod = archive?.from ? snapshots.filter((s) => s.day >= archive.from!) : snapshots;
    return inPeriod.map((s) => ({ day: s.day, v: Math.round(sumTotals(s, kinds).accomplished) }));
  }, [snapshots, archive?.from, kinds]);

  const span = series.length ? Math.max(...series.map((p) => p.v)) - Math.min(...series.map((p) => p.v)) : 0;
  const period = useMemo(() => {
    if (!snapshots.length) return null;
    const from = archive?.from;
    const before = from ? [...snapshots].reverse().find((s) => s.day < from) : undefined;
    const start = before ?? (from ? snapshots.find((s) => s.day >= from) : snapshots[0]);
    const end = snapshots[snapshots.length - 1];
    const a = sumTotals(start, kinds);
    const b = sumTotals(end, kinds);
    return { start, end, volume: b.accomplished - a.accomplished, done: b.done - a.done, points: b.pointsCleaned - a.pointsCleaned, records: b.records };
  }, [snapshots, archive?.from, kinds]);

  const changes = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (archive?.changes ?? []).filter((c) => kinds.includes(c.kind) && (!needle || `${c.name} ${c.site} ${c.region}`.toLowerCase().includes(needle)));
  }, [archive?.changes, kinds, q]);
  const updated = useMemo(() => new Set(changes.filter((c) => c.change === "update").map((c) => c.key)).size, [changes]);
  const groups = useMemo(() => {
    const out: { day: string; items: ArchiveChange[] }[] = [];
    for (const c of changes.slice(0, shown)) {
      const last = out[out.length - 1];
      if (last?.day === c.day) last.items.push(c);
      else out.push({ day: c.day, items: [c] });
    }
    return out;
  }, [changes, shown]);
  const dayCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of changes) m.set(c.day, (m.get(c.day) ?? 0) + 1);
    return m;
  }, [changes]);

  const baseline = snapshots.find((s) => s.baseline);
  const what = kinds.length === 1 && kinds[0] ? `${KIND[kinds[0]].label.toLowerCase()} ${kinds[0] === "isf" ? "records" : "lines"}` : "records";
  const volumeWord = kinds.length === 1 && kinds[0] === "drainage" ? "Declogged" : "Volume removed";

  if (query.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-[var(--dpwh-border)] bg-white" role="status">
        <span className="size-8 animate-spin rounded-full border-2 border-[#c3cedb] border-t-[var(--dpwh-orange)]" aria-label="Loading the history" />
      </div>
    );
  }
  if (query.error) return <Empty>The history could not be loaded. Try again in a moment.</Empty>;
  if (!archive?.ready || !snapshots.length) {
    return (
      <Panel title="History" icon={History}>
        <p className="text-sm text-[var(--dpwh-text)]">The history starts with its first nightly snapshot.</p>
        <p className="mt-1 text-sm text-[var(--dpwh-muted)]">
          Every night the figures of every waterway and drainage line are saved from the OKB Single Source of Truth, and each change (volume,
          progress, status, points cleaned) is listed here by day, so progress can be followed over weeks and months.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <Panel title="History" icon={History} bodyClassName="p-3 sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--dpwh-muted)]">
            Nightly snapshots since <span className="font-semibold text-[var(--dpwh-text)]">{dayText(archive.since)}</span> · {int(snapshots.length)} day
            {snapshots.length === 1 ? "" : "s"} · {what}
          </p>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-[#eef2f7] p-1" role="group" aria-label="Period">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                aria-pressed={days === p.value}
                onClick={() => {
                  setDays(p.value);
                  setShown(PAGE);
                }}
                className={cn("h-10 rounded-md px-2.5 text-xs font-bold transition-colors", days === p.value ? "bg-white text-[var(--dpwh-blue-dark)] shadow-sm" : "text-[var(--dpwh-muted)] hover:text-[var(--dpwh-blue-dark)]")}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {period ? (
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Figure label={volumeWord} value={`${signed(period.volume)} m³`} hint={`now ${compact(sumTotals(period.end, kinds).accomplished)} m³ in all`} />
            <Figure label="Newly completed" value={signed(period.done)} hint={`${int(sumTotals(period.end, kinds).done)} of ${int(period.records)} completed`} />
            <Figure label="Records updated" value={int(updated)} hint={`${int(changes.length)} change${changes.length === 1 ? "" : "s"} recorded`} />
            <Figure label="Points cleaned" value={signed(period.points)} hint={period.start && period.start.day !== period.end?.day ? `since ${dayText(period.start.day, true)}` : "since the first snapshot"} />
          </div>
        ) : null}

        {series.length >= 2 ? (
          <figure className="mt-4">
            <figcaption className="flex items-center gap-1.5 text-xs font-bold text-[var(--dpwh-blue-dark)]">
              <TrendingUp className="size-3.5 text-[var(--dpwh-orange)]" aria-hidden /> {volumeWord} to date (m³), by night
            </figcaption>
            <div className="mt-2 h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="okb-archive-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={LINE} stopOpacity={0.18} />
                      <stop offset="100%" stopColor={LINE} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e3e8ef" vertical={false} />
                  <XAxis dataKey="day" tickFormatter={(d: string) => dayText(d, true)} tick={{ fontSize: 11, fill: "#5b6b80" }} tickLine={false} axisLine={{ stroke: "#d7dee8" }} minTickGap={24} />
                  <YAxis tickFormatter={tickFormat(span)} tick={{ fontSize: 11, fill: "#5b6b80" }} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(v) => [`${int(Number(v))} m³`, volumeWord]}
                    labelFormatter={(d) => dayText(String(d))}
                    contentStyle={{ borderRadius: 10, border: "1px solid #d7dee8", fontSize: 12 }}
                    cursor={{ stroke: "#8fa3bf", strokeDasharray: "3 3" }}
                  />
                  <Area type="monotone" dataKey="v" stroke={LINE} strokeWidth={2} fill="url(#okb-archive-fill)" dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </figure>
        ) : (
          <p className="mt-3 rounded-lg bg-[#f6f8fb] px-3 py-2 text-xs text-[var(--dpwh-muted)]">The trend chart appears after the second nightly snapshot.</p>
        )}
      </Panel>

      <Panel
        title="Changes by day"
        icon={ArrowRight}
        bodyClassName="p-2 sm:p-3"
        action={
          changes.length ? (
            <button type="button" onClick={() => downloadCsv(changes)} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[var(--dpwh-blue)] hover:bg-[var(--dpwh-blue-light)]">
              <Download className="size-4" aria-hidden /> CSV
            </button>
          ) : null
        }
      >
        <label className="relative mb-2 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--dpwh-muted)]" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Find a waterway, drainage line or site"
            aria-label="Find in the history"
            className="h-11 w-full rounded-lg border border-[var(--dpwh-border)] bg-white pl-9 pr-3 text-sm text-[var(--dpwh-text)] placeholder:text-[var(--dpwh-muted)]"
          />
        </label>
        {groups.length ? (
          <div className="space-y-3">
            {groups.map((g) => (
              <section key={g.day} aria-label={dayText(g.day)}>
                <h4 className="flex items-baseline justify-between gap-2 border-b border-[#eef1f5] px-1 pb-1.5 pt-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--dpwh-orange-dark)]">{dayText(g.day)}</span>
                  <span className="text-[11px] text-[var(--dpwh-muted)]">
                    {int(dayCounts.get(g.day) ?? g.items.length)} change{(dayCounts.get(g.day) ?? g.items.length) === 1 ? "" : "s"}
                  </span>
                </h4>
                <ol className="space-y-2">
                  {g.items.map((c) => {
                    const sel = c.change === "removed" ? null : find(c.name);
                    return (
                      <li key={c.id}>
                        <ChangeCard c={c} onOpen={sel ? () => onOpenRecord(sel) : undefined} />
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
            {changes.length > shown ? (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="flex h-11 w-full items-center justify-center rounded-lg border border-[var(--dpwh-border)] bg-white text-xs font-bold text-[var(--dpwh-blue)] hover:bg-[var(--dpwh-blue-light)]"
              >
                Show more ({int(changes.length - shown)} left)
              </button>
            ) : null}
          </div>
        ) : (
          <Empty>{q ? "No changes match this search." : "No changes recorded in this period."}</Empty>
        )}
        {archive.truncated ? <p className="mt-2 px-1 text-[11px] text-[var(--dpwh-muted)]">Only the newest 3,000 changes of this period are listed; choose a shorter period to see them all.</p> : null}
        {baseline && (!archive.from || baseline.day >= archive.from) && !q ? (
          <p className="mt-3 rounded-lg bg-[#f6f8fb] px-3 py-2 text-xs text-[var(--dpwh-muted)]">
            <span className="font-semibold text-[var(--dpwh-text)]">{dayText(baseline.day)}:</span> history started with {int(baseline.records)} records saved as the starting point.
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
