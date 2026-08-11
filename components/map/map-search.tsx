"use client";

import { SearchBox } from "@/components/ui/search-box";
import { cn } from "@/utils/cn";

interface MapSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Map-embedded location search input. */
export function MapSearch({
  value,
  onChange,
  onSubmit,
  placeholder = "Search location…",
  className,
}: MapSearchProps) {
  return (
    <form
      className={cn("pointer-events-auto w-64", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
    >
      <SearchBox
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="glass shadow-panel [&_input]:bg-transparent"
        aria-label="Search map location"
      />
    </form>
  );
}
