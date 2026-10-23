"use client";

import { useMemo, useState } from "react";
import { Droplets, MapPin, Search, Waves, X } from "lucide-react";
import {
  areaDrainage,
  areaWaterways,
  regionDrainage,
  regionWaterways,
  type Coverage,
  type CoverageArea,
} from "@/lib/config/okb-coverage";
import { CoverageSheet, type CoverageItem } from "@/components/public/accomplishment-live/coverage-sheet";
import { cn } from "@/utils/cn";

type Kind = "all" | "waterways" | "drainage";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function AreaBlock({ area, kind, q, onOpen }: { area: CoverageArea; kind: Kind; q: string; onOpen: (name: string, kind: CoverageItem["kind"], area: string) => void }) {
  const match = (s: string) => !q || norm(s).includes(q) || norm(area.name).includes(q);
  const waterways = kind === "drainage" ? [] : (area.waterways ?? []).filter(match);
  const drainage = kind === "waterways" ? [] : (area.drainage ?? []).filter(match);
  const unlisted = kind !== "drainage" && !q ? (area.unlistedWaterways ?? 0) : 0;
  if (!waterways.length && !drainage.length && !unlisted) return null;
  return (
    <div className="okb-cov-area">
      <p className="okb-cov-area__head">
        <MapPin className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">{area.name}</span>
        <span className="okb-cov-area__count">
          {areaWaterways(area) ? `${areaWaterways(area)} waterway${areaWaterways(area) === 1 ? "" : "s"}` : ""}
          {areaWaterways(area) && areaDrainage(area) ? " · " : ""}
          {areaDrainage(area) ? `${areaDrainage(area)} drainage` : ""}
        </span>
      </p>
      {waterways.length || unlisted ? (
        <ul className="okb-cov-chips" aria-label={`Waterways in ${area.name}`}>
          {waterways.map((w) => (
            <li key={w}>
              <button type="button" onClick={() => onOpen(w, "waterway", area.name)} className="okb-cov-chip okb-cov-chip--water okb-cov-chip--btn">
                <Waves className="size-3 shrink-0" aria-hidden />
                {w}
              </button>
            </li>
          ))}
          {unlisted ? <li className="okb-cov-chip okb-cov-chip--muted">{unlisted} waterway{unlisted === 1 ? "" : "s"} (names to follow)</li> : null}
        </ul>
      ) : null}
      {drainage.length ? (
        <ul className="okb-cov-chips" aria-label={`Drainage lines in ${area.name}`}>
          {drainage.map((d) => (
            <li key={d}>
              <button type="button" onClick={() => onOpen(d, "drainage", area.name)} className="okb-cov-chip okb-cov-chip--drain okb-cov-chip--btn">
                <Droplets className="size-3 shrink-0" aria-hidden />
                {d}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Every waterway and drainage line in the program, by region and province / city. Tapping one opens its location,
 * live progress, details and photos (CoverageSheet). Search, a waterway / drainage filter and a region picker keep it
 * short on a phone.
 */
export function CoverageExplorer({ coverage }: { coverage: Coverage }) {
  const [region, setRegion] = useState<string>("all");
  const [kind, setKind] = useState<Kind>("all");
  const [query, setQuery] = useState("");
  const [opened, setOpened] = useState<CoverageItem | null>(null);
  const q = norm(query.trim());

  const regions = useMemo(
    () =>
      coverage.regions.filter((r) => region === "all" || r.id === region).filter((r) => {
        if (kind === "waterways" && !regionWaterways(r)) return false;
        if (kind === "drainage" && !regionDrainage(r)) return false;
        if (!q) return true;
        return (
          norm(`${r.code} ${r.name}`).includes(q) ||
          r.areas.some((a) => norm(a.name).includes(q) || [...(a.waterways ?? []), ...(a.drainage ?? [])].some((s) => norm(s).includes(q)))
        );
      }),
    [coverage, region, kind, q],
  );

  return (
    <div className="okb-cov">
      <div className="okb-cov-toolbar">
        <label className="okb-cov-search">
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Search waterways and drainage</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a river, creek, road or city…"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="okb-cov-search__clear">
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </label>
        <div className="okb-cov-kinds" role="radiogroup" aria-label="Show">
          {(
            [
              ["all", "All"],
              ["waterways", `Waterways · ${coverage.totals.waterways}`],
              ["drainage", `Drainage · ${coverage.totals.drainage}`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn("okb-cov-kind", kind === k && "okb-cov-kind--on")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="okb-cov-regions" role="radiogroup" aria-label="Region">
        <button
          type="button"
          role="radio"
          aria-checked={region === "all"}
          onClick={() => setRegion("all")}
          className={cn("okb-cov-region", region === "all" && "okb-cov-region--on")}
        >
          All regions
        </button>
        {coverage.regions.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={region === r.id}
            onClick={() => setRegion(r.id)}
            className={cn("okb-cov-region", region === r.id && "okb-cov-region--on")}
            title={r.name}
          >
            {r.code}
          </button>
        ))}
      </div>

      {regions.length === 0 ? (
        <p className="okb-cov-empty">Nothing matches “{query}”.</p>
      ) : (
        <div className="okb-cov-list">
          {regions.map((r) => (
            <section key={r.id} id={`coverage-${r.id}`} className="okb-cov-card">
              <header className="okb-cov-card__head">
                <span className="okb-cov-card__code">{r.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="okb-cov-card__name">{r.name}</span>
                  <span className="okb-cov-card__meta">
                    {r.areas.map((a) => a.name).join(" · ")}
                  </span>
                </span>
                <span className="okb-cov-card__nums">
                  {regionWaterways(r) ? (
                    <span>
                      <b>{regionWaterways(r)}</b> waterways
                    </span>
                  ) : null}
                  {regionDrainage(r) ? (
                    <span>
                      <b>{regionDrainage(r)}</b> drainage
                    </span>
                  ) : null}
                </span>
              </header>
              <div className="okb-cov-card__body">
                {r.areas.map((a) => (
                  <AreaBlock
                    key={a.name}
                    area={a}
                    kind={kind}
                    q={norm(`${r.code} ${r.name}`).includes(q) ? "" : q}
                    onOpen={(name, k, area) => setOpened({ name, kind: k, area, regionCode: r.code, regionName: r.name })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="okb-cov-note">
        Tap a waterway or drainage line for its location, progress and photos.{" "}
        {coverage.live
          ? `Live from the OKB Single Source of Truth, as of ${coverage.asOf}.`
          : `From the OKB accomplishment reports as of ${coverage.asOf}; volumes and progress are live.`}
      </p>
      <CoverageSheet item={opened} onClose={() => setOpened(null)} />
    </div>
  );
}
