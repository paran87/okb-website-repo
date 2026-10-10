"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownWideNarrow, ChevronRight, Download, Home, RefreshCw, Search, Shovel, Waves, X, Droplets } from "lucide-react";
import { Meter, ProgressRing, StatusIcon, StatusStrip, pctText } from "@/features/accomplishment/components/progress-visuals";
import { RegionSheet } from "@/features/accomplishment/components/region-sheet";
import {
  DEFAULT_PREFS,
  compactVolume,
  recordPct,
  recordType,
  regionLabel,
  rollup,
  statusCounts,
  toCsv,
  visibleTree,
  WORK_STATUS,
  WORK_STATUS_ORDER,
  volumeTotals,
  workStatus,
  type Prefs,
  type RecordFilter,
  type RecordType,
  type RollupMode,
  type VisibleRegion,
} from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData } from "@/features/accomplishment/types";
import { cn } from "@/utils/cn";

const PREFS_KEY = "okb.progress.prefs";

type RegionOrder = "progress" | "geo" | "volume";

const TYPES: { value: RecordType; label: string; icon: typeof Waves }[] = [
  { value: "waterway", label: "Waterways", icon: Waves },
  { value: "drainage", label: "Drainage", icon: Droplets },
  { value: "isf", label: "ISF", icon: Home },
];

const int = (n: number) => Math.round(n).toLocaleString("en-US");

function updatedAt(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  }).format(new Date(iso));
}

function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<Prefs> | null;
    if (!saved) return DEFAULT_PREFS;
    const types = (saved.types ?? []).filter((t): t is RecordType => ["waterway", "drainage", "isf"].includes(t));
    return {
      mode: saved.mode === "wtd" ? "wtd" : "avg",
      filter: saved.filter === "target" || saved.filter === "zero" ? saved.filter : "all",
      types: types.length ? types : DEFAULT_PREFS.types,
      regions: [],
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** A small two- or three-way switch. */
function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground sm:w-auto">{label}</span>
      <div className="flex min-w-0 flex-1 rounded-lg bg-muted/60 p-0.5" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            title={o.title}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-9 min-w-0 flex-1 whitespace-nowrap rounded-md px-3 text-xs font-medium transition-colors",
              value === o.value ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RegionCard({ region, scale, rank, onOpen }: { region: VisibleRegion; scale: AccomplishmentData["scale"]; rank: number | null; onOpen: () => void }) {
  const label = regionLabel(region);
  const volume = volumeTotals(region.ways);
  const counts = statusCounts(region.ways, scale);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-card transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-semibold text-foreground">
            {rank !== null ? (
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted font-mono text-[11px] text-muted-foreground">{rank}</span>
            ) : null}
            <span className="truncate">{label.code}</span>
          </p>
          {label.name ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{label.name}</p> : null}
        </div>
        <span className="font-mono text-xl font-semibold leading-none tabular-nums text-foreground">{pctText(region.pct)}</span>
      </div>
      <Meter pct={region.pct} className="h-2" label={`${label.code} progress`} />
      <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Records by status">
        {WORK_STATUS_ORDER.filter((st) => counts[st] > 0).map((st) => (
          <li key={st} className="flex items-center gap-1 text-xs text-muted-foreground" title={WORK_STATUS[st].label}>
            <StatusIcon status={st} />
            <span className="sr-only">{WORK_STATUS[st].label}</span>
            <span className="font-mono tabular-nums text-foreground">{counts[st]}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {region.sites.length} site{region.sites.length === 1 ? "" : "s"} · {region.ways.length} record{region.ways.length === 1 ? "" : "s"}
          {volume.plan ? ` · ${compactVolume(volume.acc)} / ${compactVolume(volume.plan)} m³` : ""}
        </span>
        <ChevronRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </div>
    </button>
  );
}

/** Dredging and desilting progress: nationwide overview, a card per region, and each region's sites and waterways. */
export function AccomplishmentView({ data }: { data: AccomplishmentData }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<RegionOrder>("progress");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // The viewer's last settings (this browser only), read after hydration.
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);
  const update = (patch: Partial<Prefs>) =>
    setPrefs((p) => {
      const next = { ...p, ...patch };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // Private mode: the settings just are not remembered.
      }
      return next;
    });

  const tree = useMemo(() => visibleTree(data, prefs, ""), [data, prefs]);
  const ways = useMemo(() => tree.flatMap((r) => r.ways), [tree]);
  const overall = useMemo(() => rollup(ways, prefs, data.scale), [ways, prefs, data.scale]);
  const volume = useMemo(() => volumeTotals(ways), [ways]);
  const counts = useMemo(() => statusCounts(ways, data.scale), [ways, data.scale]);
  const sites = tree.reduce((n, r) => n + r.sites.length, 0);

  const regions = useMemo(() => {
    // Sites without a region are not a region: always listed last.
    const other = (r: VisibleRegion) => (regionLabel(r).code === "Other" ? 1 : 0);
    if (order === "geo") return [...tree].sort((a, b) => other(a) - other(b));
    const key = (r: VisibleRegion) => (order === "volume" ? volumeTotals(r.ways).acc : (r.pct ?? -1));
    return [...tree].sort((a, b) => other(a) - other(b) || key(b) - key(a));
  }, [tree, order]);

  const q = search.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return tree.flatMap((r) =>
      r.sites.flatMap((s) =>
        s.w
          .filter((w) => [w.n, s.n, r.n, r.a, w.o].some((t) => t.toLowerCase().includes(q)))
          .map((w) => ({ w, site: s.n, region: r })),
      ),
    );
  }, [tree, q]);

  const opened = openKey ? (tree.find((r) => r.key === openKey) ?? null) : null;

  const toggleType = (t: RecordType) => {
    const has = prefs.types.includes(t);
    if (has && prefs.types.length === 1) return; // At least one type stays on.
    update({ types: has ? prefs.types.filter((x) => x !== t) : [...prefs.types, t] });
  };

  const downloadCsv = () => {
    const blob = new Blob([`﻿${toCsv(tree, data.scale)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `okb-desilting-progress-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const refresh = () => {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 1200);
  };

  const typeCounts = { waterway: 0, drainage: 0, isf: 0 };
  for (const w of ways) typeCounts[recordType(w)]++;

  return (
    <div className="h-full min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 pb-12 pt-3 sm:px-5 sm:pt-5 lg:gap-5">
        {/* Title */}
        <header className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Shovel className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold leading-tight text-foreground sm:text-xl">Dredging &amp; Desilting Progress</h1>
            <p className="text-xs text-muted-foreground">Oplan Kontra Baha · updated {updatedAt(data.generatedAt)}</p>
          </div>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!tree.length}
            aria-label="Download CSV"
            title="Download CSV"
            className="inline-flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted/60 disabled:opacity-50 sm:w-auto sm:px-3"
          >
            <Download className="size-4" aria-hidden />
            <span className="hidden text-xs font-medium sm:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh"
            title="Refresh"
            className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted/60"
          >
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden />
          </button>
        </header>

        {/* Overview */}
        <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-8">
          <div className="flex items-center gap-4">
            <ProgressRing pct={overall} caption={prefs.mode === "wtd" ? "by volume" : "average"} />
            <dl className="grid gap-2 text-sm lg:hidden">
              <div>
                <dt className="text-xs text-muted-foreground">Removed</dt>
                <dd className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  {compactVolume(volume.acc)} <span className="text-xs font-normal text-muted-foreground">m³</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Coverage</dt>
                <dd className="text-xs text-foreground">
                  {tree.length} regions · {sites} sites · {ways.length} records
                </dd>
              </div>
            </dl>
          </div>

          <div className="hidden lg:block">
            <p className="text-xs text-muted-foreground">Volume removed</p>
            <p className="mt-1 font-mono text-3xl font-semibold leading-none tabular-nums text-foreground">
              {int(volume.acc)} <span className="text-sm font-normal text-muted-foreground">m³</span>
            </p>
            <Meter pct={volume.plan ? (volume.acc / volume.plan) * 100 : null} className="mt-3 h-2" label="Volume removed of planned" />
            <p className="mt-2 text-xs text-muted-foreground">
              of {int(volume.plan)} m³ planned · {tree.length} regions · {sites} sites
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Status of {ways.length} record{ways.length === 1 ? "" : "s"}
            </p>
            <StatusStrip counts={counts} />
          </div>
        </section>

        {/* Controls */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative block md:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a waterway, site or region"
              aria-label="Find a waterway, site or region"
              className="min-h-11 w-full rounded-lg border border-border bg-card pl-9 pr-10 text-sm text-foreground outline-none ring-ring placeholder:text-muted-foreground focus:ring-2 [&::-webkit-search-cancel-button]:appearance-none"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted/60"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </label>

          <div className="flex gap-1.5 md:shrink-0" role="group" aria-label="Record types">
            {TYPES.map(({ value, label, icon: Icon }) => {
              const on = prefs.types.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleType(value)}
                  className={cn(
                    "inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors md:flex-none",
                    on ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                  {on ? <span className="font-mono tabular-nums opacity-80">{typeCounts[value]}</span> : null}
                </button>
              );
            })}
          </div>

          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:gap-6">
            <Toggle<RollupMode>
              label="Measure"
              value={prefs.mode}
              onChange={(mode) => update({ mode })}
              options={[
                { value: "avg", label: "Average", title: "Every record counts the same." },
                { value: "wtd", label: "By volume", title: "Bigger planned volumes count more." },
              ]}
            />
            <Toggle<RecordFilter>
              label="Include"
              value={prefs.filter}
              onChange={(filter) => update({ filter })}
              options={[
                { value: "all", label: "All" },
                { value: "target", label: "Planned", title: "Only records with a planned volume." },
                { value: "zero", label: "Active", title: "Leave out records with nothing planned and nothing done." },
              ]}
            />
          </div>
        </section>

        {q ? (
          /* Search results */
          <section aria-label="Search results" className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
            <p className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
              {results.length} match{results.length === 1 ? "" : "es"} for “{search.trim()}”
              {results.length > 80 ? " · showing the first 80" : ""}
            </p>
            {results.length ? (
              <ul>
                {results.slice(0, 80).map(({ w, site, region }) => {
                  const pct = recordPct(w, data.scale);
                  return (
                    <li key={`${region.key}|${site}|${w.n}`} className="border-b border-border/60 last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setOpenKey(region.key)}
                        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <StatusIcon status={workStatus(w, data.scale)} className="size-4" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{w.n}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {regionLabel(region).code} · {site}
                          </span>
                          <Meter pct={pct} className="mt-1.5 h-1 sm:hidden" />
                        </span>
                        <Meter pct={pct} className="hidden w-40 sm:block" />
                        <span className="w-16 shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-foreground">{pctText(pct)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Nothing found. Try another name.</p>
            )}
          </section>
        ) : (
          /* Regions */
          <section aria-label="Regions" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Regions <span className="hidden font-normal text-muted-foreground sm:inline">· open one for its sites</span>
              </h2>
              <label className="relative flex items-center gap-1.5 text-xs text-muted-foreground">
                <ArrowDownWideNarrow className="size-4" aria-hidden />
                <span className="sr-only">Sort regions</span>
                <select
                  value={order}
                  onChange={(e) => setOrder(e.target.value as RegionOrder)}
                  className="min-h-10 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground outline-none ring-ring focus:ring-2"
                >
                  <option value="progress">Most progress</option>
                  <option value="volume">Most volume removed</option>
                  <option value="geo">North to south</option>
                </select>
              </label>
            </div>
            {regions.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {regions.map((r, i) => (
                  <RegionCard
                    key={r.key}
                    region={r}
                    scale={data.scale}
                    rank={order === "geo" || regionLabel(r).code === "Other" ? null : i + 1}
                    onOpen={() => setOpenKey(r.key)}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No records with these settings.
              </p>
            )}
          </section>
        )}

        <footer className="text-xs leading-relaxed text-muted-foreground">
          From the OKB Single Source of Truth, based on reports to the OKB Secretariat and regional office pages. Spotted a
          discrepancy? Email{" "}
          <a href="mailto:okb@dpwh.gov.ph" className="font-medium text-primary underline-offset-2 hover:underline">
            okb@dpwh.gov.ph
          </a>
          .
        </footer>
      </div>

      <RegionSheet region={opened} scale={data.scale} onClose={() => setOpenKey(null)} />
    </div>
  );
}
