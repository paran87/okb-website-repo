"use client";

import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils/cn";

interface LayerToggleCardProps {
  label: string;
  value: string;
  caption: string;
  color: string;
  icon: LucideIcon;
  visible: boolean;
  onToggle: () => void;
  /** Optional 0–1 split shown as a thin two-tone bar (e.g. located share). */
  split?: number;
  className?: string;
}

/** Headline number that doubles as the on/off switch for its map layer. */
export function LayerToggleCard({
  label,
  value,
  caption,
  color,
  icon: Icon,
  visible,
  onToggle,
  split,
  className,
}: LayerToggleCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={`${visible ? "Hide" : "Show"} ${label} on map`}
      className={cn(
        "glass pointer-events-auto group relative flex min-h-11 flex-1 items-center gap-2 overflow-hidden rounded-lg border border-border/60 py-1 pl-2.5 pr-1.5 text-left shadow-panel transition-all hover:-translate-y-px hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-w-[148px] sm:gap-2.5 sm:rounded-xl sm:px-3 sm:py-2",
        !visible && "opacity-60",
        className,
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span
        className="hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex"
        style={{ backgroundColor: `${color}26`, color }}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 truncate text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:block sm:text-[11px]">
          <Icon className="size-3 shrink-0 sm:hidden" style={{ color }} aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        <span className="block truncate font-mono text-base font-semibold leading-tight text-foreground sm:text-xl">
          {value}
        </span>
        <span className="hidden truncate text-[11px] text-muted-foreground sm:block">
          {caption}
        </span>
        {split !== undefined ? (
          <span
            className="mt-1 flex h-1 overflow-hidden rounded-full bg-muted"
            aria-hidden
          >
            <span
              className="h-full"
              style={{ width: `${split * 100}%`, backgroundColor: color }}
            />
          </span>
        ) : null}
      </span>
      {visible ? (
        <Eye className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" aria-hidden />
      ) : (
        <EyeOff className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}
