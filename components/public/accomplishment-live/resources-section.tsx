"use client";

import { HardHat, Truck, Users } from "lucide-react";
import type { PublicAccomplishment, Quantity } from "@/features/accomplishment/public-types";
import { Empty, int, Panel } from "@/components/public/accomplishment-live/shared";

const SOURCE_LABEL: Record<string, string> = {
  "RO/DEO": "DPWH regional / district offices",
  LGU: "Local government units",
  PRIVATE: "Private sector",
  BOE: "Bureau of Equipment",
};

const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\b(Lgu|Deo|Ro|Boe)\b/g, (m) => m.toUpperCase());

function Bars({ rows, color }: { rows: Quantity[]; color: string }) {
  const max = Math.max(1, ...rows.map((r) => r.qty));
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-[var(--dpwh-text)]">{SOURCE_LABEL[r.label] ?? title(r.label)}</span>
            <span className="shrink-0 font-display text-lg font-bold tabular-nums text-[var(--dpwh-blue-dark)]">{int(r.qty)}</span>
          </div>
          <span className="mt-1 block h-2 overflow-hidden rounded-full bg-[#e3e8ef]">
            <span className="block h-full rounded-full" style={{ width: `${(100 * r.qty) / max}%`, backgroundColor: color }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Equipment and manpower deployed per site (SiteVsEquipment, SiteVsManpower). */
export function ResourcesSection({ data }: { data: PublicAccomplishment }) {
  const r = data.resources;
  if (!r.sites.length) return <Empty>No equipment or manpower reported yet.</Empty>;
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="grid grid-cols-2 gap-3 lg:col-span-12">
        <div className="rounded-xl bg-[var(--dpwh-blue-dark)] p-4 text-white">
          <Truck className="size-6 text-[var(--dpwh-gold)]" aria-hidden />
          <p className="mt-2 font-display text-4xl font-bold leading-none">{int(r.equipment)}</p>
          <p className="mt-1 text-xs text-white/75">units of equipment deployed</p>
        </div>
        <div className="rounded-xl bg-[var(--dpwh-orange)] p-4 text-white">
          <Users className="size-6 text-white" aria-hidden />
          <p className="mt-2 font-display text-4xl font-bold leading-none">{int(r.manpower)}</p>
          <p className="mt-1 text-xs text-white/85">personnel on the ground</p>
        </div>
      </div>

      <Panel title="Equipment by type" icon={Truck} className="lg:col-span-6">
        <Bars rows={r.equipmentByType.slice(0, 12)} color="#0038a8" />
        {r.equipmentByType.length > 12 ? (
          <p className="mt-3 text-xs text-[var(--dpwh-muted)]">
            + {r.equipmentByType.length - 12} more types ({int(r.equipmentByType.slice(12).reduce((n, e) => n + e.qty, 0))} units)
          </p>
        ) : null}
      </Panel>

      <div className="space-y-4 lg:col-span-6">
        <Panel title="Equipment by source" icon={HardHat}>
          <Bars rows={r.equipmentBySource} color="#0038a8" />
        </Panel>
        <Panel title="Manpower by source" icon={Users}>
          <Bars rows={r.manpowerBySource} color="#f57e20" />
        </Panel>
      </div>

      <Panel title="Per site" icon={HardHat} className="lg:col-span-12" bodyClassName="p-2 sm:p-3">
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {r.sites.map((s) => (
            <li key={s.site} className="rounded-xl border border-[#e3e8ef] bg-[#fbfcfe] p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold uppercase tracking-wide text-[var(--dpwh-blue-dark)]">{s.site}</p>
                  {s.region ? <p className="text-xs text-[var(--dpwh-muted)]">{s.region}</p> : null}
                </div>
                <div className="flex shrink-0 gap-3 text-right">
                  <span>
                    <span className="block font-display text-xl font-bold leading-none text-[var(--dpwh-blue)]">{int(s.equipment)}</span>
                    <span className="text-[10px] uppercase tracking-wide text-[var(--dpwh-muted)]">equip.</span>
                  </span>
                  <span>
                    <span className="block font-display text-xl font-bold leading-none text-[var(--dpwh-orange-dark)]">{int(s.manpower)}</span>
                    <span className="text-[10px] uppercase tracking-wide text-[var(--dpwh-muted)]">crew</span>
                  </span>
                </div>
              </div>
              {s.items.length ? (
                <ul className="mt-2 flex flex-wrap gap-1">
                  {s.items.map((it, i) => (
                    <li key={`${it.type}-${it.source}-${i}`} className="rounded-md bg-[var(--dpwh-blue-light)] px-1.5 py-0.5 text-[11px] text-[var(--dpwh-blue-dark)]">
                      <span className="font-bold">{int(it.qty)}×</span> {title(it.type)}
                      <span className="text-[var(--dpwh-muted)]"> · {it.source}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {s.crew.length ? (
                <p className="mt-2 text-[11px] text-[var(--dpwh-muted)]">Crew: {s.crew.map((c) => `${int(c.qty)} ${c.source}`).join(" · ")}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
