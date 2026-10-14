"use client";

import { useMemo } from "react";
import { Droplets, Waves } from "lucide-react";
import { useAccomplishment } from "@/components/public/accomplishment-live/data";
import { locateAll, matchRecord } from "@/components/public/accomplishment-live/match";
import { WaterwayDetail } from "@/components/public/accomplishment-live/regions";
import { Sheet } from "@/components/public/accomplishment-live/shared";
import { WaterwayMap } from "@/components/public/accomplishment-live/waterway-map";

export interface CoverageItem {
  name: string;
  kind: "waterway" | "drainage";
  area: string;
  regionCode: string;
  regionName: string;
}

/** A coverage chip, opened: where it is, and its live progress, details and photos when the dashboard has it. */
export function CoverageSheet({ item, onClose }: { item: CoverageItem | null; onClose: () => void }) {
  const query = useAccomplishment();
  const records = useMemo(() => (query.data ? locateAll(query.data) : []), [query.data]);
  const match = useMemo(() => (item && records.length ? matchRecord(item.name, item.regionCode, records, item.kind) : null), [item, records]);
  if (!item) return null;
  const Icon = item.kind === "drainage" ? Droplets : Waves;
  const place = [item.area, item.regionName].filter(Boolean).join(", ");

  return (
    <Sheet
      open
      onClose={onClose}
      title={item.name}
      subtitle={[match?.region ?? item.regionCode, match?.site ?? item.area, match?.record.x?.city].filter(Boolean).join(" · ")}
    >
      {query.isLoading ? (
        <div className="space-y-3" aria-label="Loading">
          <div className="h-36 animate-pulse rounded-xl bg-[#d7dee8]" />
          <div className="h-56 animate-pulse rounded-xl bg-[#d7dee8]" />
        </div>
      ) : match && query.data ? (
        <WaterwayDetail sel={match} scale={query.data.scale} />
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-white p-4 shadow-[0_1px_3px_rgba(0,40,85,0.08)]">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--dpwh-orange-dark)]">
              <Icon className="size-4" aria-hidden />
              {item.kind === "drainage" ? "Drainage line" : "Waterway"}
            </p>
            <p className="mt-1 text-sm text-[var(--dpwh-text)]">{place}</p>
            <p className="mt-2 text-xs text-[var(--dpwh-muted)]">
              {query.error
                ? "The live dashboard could not be loaded right now."
                : "Its progress is not in the live dashboard yet. It is part of the program as of the October 8 accomplishment reports."}
            </p>
          </div>
          <WaterwayMap name={item.name} place={place} />
        </div>
      )}
    </Sheet>
  );
}
