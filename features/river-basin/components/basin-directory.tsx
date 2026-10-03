"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BookOpenText,
  FileText,
  Layers,
  Mountain,
  Search,
  X,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import type { BasinSummary, Island } from "@/lib/river-basin/summary";
import { cn } from "@/utils/cn";
import { BasinOutline } from "@/features/river-basin/components/basin-shape";

type Sort = "number" | "name" | "area" | "studies";

const ISLANDS: (Island | "All")[] = ["All", "Luzon", "Visayas", "Mindanao"];
const SORTS: { id: Sort; label: string }[] = [
  { id: "number", label: "Basin no." },
  { id: "name", label: "Name A–Z" },
  { id: "area", label: "Largest area" },
  { id: "studies", label: "Most studies" },
];

const ISLAND_TONE: Record<Island, string> = {
  Luzon: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Visayas: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Mindanao: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

const num = (n: number) => n.toLocaleString();

/** Searchable, filterable grid of the 18 major river basins. */
export function BasinDirectory({ basins }: { basins: BasinSummary[] }) {
  const [query, setQuery] = useState("");
  const [island, setIsland] = useState<Island | "All">("All");
  const [sort, setSort] = useState<Sort>("number");

  const totals = useMemo(
    () => ({
      area: basins.reduce((s, b) => s + (b.areaKm2 ?? 0), 0),
      studies: basins.reduce((s, b) => s + b.docCount, 0),
      pages: basins.reduce((s, b) => s + b.pages, 0),
    }),
    [basins],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = basins.filter(
      (b) =>
        (island === "All" || b.island === island) &&
        (!q || b.label.toLowerCase().includes(q) || String(b.number) === q),
    );
    return [...list].sort((a, b) => {
      if (sort === "name") return a.label.localeCompare(b.label);
      if (sort === "area") return (b.areaKm2 ?? 0) - (a.areaKm2 ?? 0);
      if (sort === "studies") return b.docCount - a.docCount;
      return a.number - b.number;
    });
  }, [basins, query, island, sort]);

  return (
    <div className="space-y-5">
      <section className="border-border bg-card relative overflow-hidden rounded-2xl border p-5 sm:p-6">
        <div
          className="text-primary/10 pointer-events-none absolute -top-6 -right-6 hidden size-52 sm:block"
          aria-hidden
        >
          <Mountain className="size-full" strokeWidth={1} />
        </div>
        <p className="text-primary text-xs font-semibold tracking-wider uppercase">
          DPWH · 18 Major River Basins
        </p>
        <h1 className="text-foreground mt-1 text-2xl font-semibold sm:text-3xl">
          River Basins
        </h1>
        <p className="text-muted-foreground mt-1 max-w-[42rem] text-sm">
          Feasibility studies and master plans for the country’s eighteen major
          river basins, with basin boundaries, critical watersheds and
          flood-prone areas on the map.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Major basins",
              value: num(basins.length),
              icon: Mountain,
            },
            {
              label: "Basin area",
              value: `${num(Math.round(totals.area))} km²`,
              icon: Layers,
            },
            {
              label: "Studies on file",
              value: num(totals.studies),
              icon: FileText,
            },
            {
              label: "Pages to read",
              value: num(totals.pages),
              icon: BookOpenText,
            },
          ].map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="border-border/70 bg-background/60 rounded-xl border p-3"
            >
              <dt className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium">
                <Icon className="text-primary size-3.5" aria-hidden />
                {label}
              </dt>
              <dd className="text-foreground mt-1 font-mono text-xl font-semibold">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-80">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a basin by name or number…"
            aria-label="Search river basins"
            className="border-border bg-card focus:ring-ring h-10 w-full rounded-lg border pr-9 pl-9 text-sm outline-none focus:ring-2"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
        <div
          role="group"
          aria-label="Island group"
          className="flex flex-wrap gap-1.5"
        >
          {ISLANDS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setIsland(item)}
              aria-pressed={island === item}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                island === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted/60",
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <label className="text-muted-foreground flex items-center gap-2 text-xs lg:ml-auto">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="border-border bg-card text-foreground focus:ring-ring h-9 rounded-lg border px-2 text-sm outline-none focus:ring-2"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-muted-foreground text-xs" aria-live="polite">
        Showing {visible.length} of {basins.length} basins
      </p>

      {visible.length === 0 ? (
        <div className="border-border rounded-xl border border-dashed py-16 text-center">
          <p className="text-foreground text-sm font-medium">
            No basin matches your search
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsland("All");
            }}
            className="text-primary mt-2 text-sm font-medium hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((b) => (
            <li key={b.slug}>
              <Link
                href={`${ROUTES.riverBasin}/${b.slug}`}
                className="group border-border bg-card hover:border-primary/50 focus-visible:ring-ring flex h-full flex-col gap-4 rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex items-start gap-3">
                  <div className="bg-primary/5 text-primary group-hover:bg-primary/10 flex size-20 shrink-0 items-center justify-center rounded-lg p-2 transition-colors">
                    <BasinOutline
                      shape={b.shape}
                      className="max-h-full max-w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono text-xs">
                        {String(b.number).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                          ISLAND_TONE[b.island],
                        )}
                      >
                        {b.island}
                      </span>
                    </div>
                    <h2 className="text-foreground group-hover:text-primary mt-1 text-base leading-tight font-semibold break-words">
                      {b.label}
                    </h2>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {b.areaKm2
                        ? `${num(Math.round(b.areaKm2))} km² basin`
                        : "Major river basin"}
                    </p>
                    {b.latestYear ? (
                      <p className="text-muted-foreground text-xs">
                        Latest study {b.latestYear}
                      </p>
                    ) : null}
                  </div>
                  <ArrowUpRight
                    className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden
                  />
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium",
                      b.fsCount
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <FileText className="size-3.5" aria-hidden />
                    {b.fsCount} feasibility{" "}
                    {b.fsCount === 1 ? "study" : "studies"}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium",
                      b.mpCount
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <BookOpenText className="size-3.5" aria-hidden />
                    {b.mpCount} master {b.mpCount === 1 ? "plan" : "plans"}
                  </span>
                  {b.pages ? (
                    <span className="text-muted-foreground ml-auto">
                      {num(b.pages)} pages
                    </span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
