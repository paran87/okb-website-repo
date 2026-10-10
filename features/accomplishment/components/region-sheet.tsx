"use client";

import { useMemo, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Meter, StatusPill, StatusStrip, pctText } from "@/features/accomplishment/components/progress-visuals";
import {
  recordPct,
  regionLabel,
  statusCounts,
  volumeTotals,
  workStatus,
  type VisibleRegion,
} from "@/features/accomplishment/lib/rollup";
import type { AccomplishmentData, AccomplishmentRecord } from "@/features/accomplishment/types";
import { cn } from "@/utils/cn";

const int = (n: number) => Math.round(n).toLocaleString("en-US");

type Order = "progress" | "name";

function sorted(ways: AccomplishmentRecord[], order: Order, scale: AccomplishmentData["scale"]) {
  return [...ways].sort((a, b) =>
    order === "name" ? a.n.localeCompare(b.n) : (recordPct(b, scale) ?? -1) - (recordPct(a, scale) ?? -1),
  );
}

/** One region opened: its sites and every waterway, drainage or ISF record under them. */
export function RegionSheet({
  region,
  scale,
  onClose,
}: {
  region: VisibleRegion | null;
  scale: AccomplishmentData["scale"];
  onClose: () => void;
}) {
  const [order, setOrder] = useState<Order>("progress");
  const label = region ? regionLabel(region) : null;
  const volume = useMemo(() => (region ? volumeTotals(region.ways) : { acc: 0, plan: 0 }), [region]);

  return (
    <Drawer
      open={Boolean(region)}
      onClose={onClose}
      title={label ? [label.code, label.name].filter(Boolean).join(" · ") : ""}
      className="max-w-xl"
    >
      {region ? (
        <div className="flex flex-col gap-5">
          <section className="rounded-xl border border-border bg-surface-2/60 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="font-mono text-3xl font-semibold leading-none tabular-nums text-foreground">{pctText(region.pct)}</p>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                <span className="font-mono font-semibold tabular-nums text-foreground">{int(volume.acc)}</span> of{" "}
                <span className="font-mono tabular-nums">{int(volume.plan)}</span> m³
              </p>
            </div>
            <Meter pct={region.pct} className="mt-3 h-2" label="Region progress" />
            <StatusStrip counts={statusCounts(region.ways, scale)} className="mt-4" />
          </section>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              {region.sites.length} site{region.sites.length === 1 ? "" : "s"}
            </p>
            <div className="flex overflow-hidden rounded-lg border border-border" role="group" aria-label="Sort records">
              {(["progress", "name"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  aria-pressed={order === o}
                  onClick={() => setOrder(o)}
                  className={cn(
                    "min-h-10 px-3 text-xs font-medium transition-colors",
                    order === o ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {o === "progress" ? "By progress" : "A–Z"}
                </button>
              ))}
            </div>
          </div>

          {region.sites.map((site) => (
            <section key={site.n} aria-label={site.n}>
              <header className="sticky top-0 z-10 -mx-5 border-y border-border bg-card/95 px-5 py-2.5 backdrop-blur">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="truncate text-sm font-semibold text-foreground">{site.n}</h3>
                  <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{pctText(site.pct)}</span>
                </div>
                <Meter pct={site.pct} className="mt-1.5" label={`${site.n} progress`} />
              </header>
              <ul>
                {sorted(site.w, order, scale).map((w) => {
                  const pct = recordPct(w, scale);
                  return (
                    <li key={w.n} className="border-b border-border/60 py-3 last:border-b-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-[13px] font-medium leading-snug text-foreground">{w.n}</p>
                        <span className="shrink-0 font-mono text-[13px] font-semibold tabular-nums text-foreground">{pctText(pct)}</span>
                      </div>
                      <Meter pct={pct} className="mt-2 h-1" label={`${w.n} progress`} />
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <StatusPill status={workStatus(w, scale)} />
                        <span>{(w.p ?? 0) > 0 ? `${int(w.v ?? 0)} / ${int(w.p ?? 0)} m³` : "No planned volume"}</span>
                        {w.o ? <span>· {w.o}</span> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      ) : null}
    </Drawer>
  );
}
