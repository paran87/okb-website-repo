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
        "glass pointer-events-auto group relative flex min-w-[148px] flex-1 items-center gap-2.5 overflow-hidden rounded-xl border border-border/60 px-3 py-2 text-left shadow-panel transition-all hover:-translate-y-px hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}26`, color }}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className="block font-mono text-xl font-semibold leading-tight text-foreground">
          {value}
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">
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
        <Eye className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      ) : (
        <EyeOff className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}
