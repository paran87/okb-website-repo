"use client";

import { Search, X } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface SearchBoxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

/** Controlled search input with icon and clear affordance. */
export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(
  (
    { value, onChange, onClear, placeholder = "Search…", className, ...props },
    ref,
  ) => {
    return (
      <div className={cn("relative", className)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={ref}
          type="search"
          role="searchbox"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-body text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/40"
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={() => (onClear ? onClear() : onChange(""))}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
    );
  },
);

SearchBox.displayName = "SearchBox";
