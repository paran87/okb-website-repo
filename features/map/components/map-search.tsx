"use client";

import { useCallback, useState } from "react";
import { Search } from "lucide-react";
import { searchService } from "@/features/map/services/search.service";
import { useMap } from "@/features/map/hooks/use-map";
import type { SearchResult } from "@/features/map/types";
import { cn } from "@/utils/cn";

/** Mock map search — roads, barangays, cities, coordinates, projects, equipment. */
export function GisMapSearch({ className }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const { flyTo } = useMap();

  const onSearch = useCallback(async (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    const found = await searchService.search({ query: value, limit: 6 });
    setResults(found);
    setOpen(true);
  }, []);

  const onSelect = (result: SearchResult) => {
    flyTo({
      longitude: result.coordinates[0],
      latitude: result.coordinates[1],
      zoom: 14,
    });
    setOpen(false);
    setQuery(result.label);
  };

  return (
    <div className={cn("pointer-events-auto relative w-64", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={query}
        onChange={(e) => void onSearch(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search map…"
        className="glass h-9 w-full rounded-lg border border-border/60 pl-9 pr-3 text-caption shadow-panel outline-none focus:border-ring"
      />
      {open && results.length > 0 ? (
        <ul className="glass absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border/60 shadow-xl">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => onSelect(result)}
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-muted/40"
              >
                <span className="text-caption font-medium text-foreground">
                  {result.label}
                </span>
                {result.subtitle ? (
                  <span className="text-label text-muted-foreground">
                    {result.subtitle}
                  </span>
                ) : null}
                <span className="text-label capitalize text-primary">
                  {result.category}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
