"use client";

import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/search-box";
import { BACOOR_CITY_WATERWAYS_URL } from "@/lib/constants";

const WATERWAYS = [
  {
    id: "bacoor",
    name: "Bacoor City Waterways",
    url: BACOOR_CITY_WATERWAYS_URL,
  },
] as const;

/** Waterways monitor with a search that currently resolves to Bacoor City. */
export function WaterwaysWorkspace() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const selected = useMemo(() => {
    return (
      WATERWAYS.find(
        (item) => !normalized || item.name.toLowerCase().includes(normalized),
      ) ?? null
    );
  }, [normalized]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 md:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-foreground">Waterways</h1>
            <p className="text-xs text-muted-foreground">
              {selected
                ? `Showing ${selected.name}.`
                : "No matching waterway monitor."}
            </p>
          </div>
          {selected ? (
            <a
              href={selected.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" aria-hidden />
              Open in new tab
            </a>
          ) : null}
        </div>
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Search Waterways"
          aria-label="Search Waterways"
          className="max-w-md"
        />
      </header>

      {selected ? (
        <iframe
          src={selected.url}
          title={selected.name}
          className="min-h-0 w-full flex-1 border-0 bg-background"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="fullscreen; geolocation"
        />
      ) : (
        <EmptyState
          title="No waterways found"
          description="Bacoor City Waterways is available. Clear the search or try Bacoor."
          className="min-h-0 flex-1"
        />
      )}
    </div>
  );
}
