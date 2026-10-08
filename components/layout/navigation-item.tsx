"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFloodMap } from "@/features/incident/hooks/use-flood-map";
import { cn } from "@/utils/cn";

export interface NavigationItemProps {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
  collapsed?: boolean;
  badge?: string | number;
  nested?: boolean;
  /** Live data behind the link: a pulsing LIVE tag with the current flooded-location count. */
  live?: boolean;
  onNavigate?: () => void;
}

/** A pulsing red dot (steady when the user prefers reduced motion). */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)} aria-hidden>
      <span className="absolute inline-flex size-full rounded-full bg-danger opacity-75 motion-safe:animate-ping" />
      <span className="relative inline-flex size-2 rounded-full bg-danger" />
    </span>
  );
}

/** Flooded locations on the map right now (same data and refresh as the Incidents map); undefined until known. */
function useLiveFloodCount() {
  return useFloodMap().data?.locations.length;
}

/** Count badge of a group with live data: the flooded locations now, hidden when there are none. */
export function LiveCountBadge() {
  const count = useLiveFloodCount();
  if (!count) return null;
  return (
    <Badge
      variant="danger"
      // Explicit size: tailwind-merge would take the text-label utility for a color and drop the red.
      className="ml-auto h-5 min-w-5 justify-center bg-danger px-1.5 text-[11px] font-bold leading-4 tabular-nums text-white"
      title={`${count} flooded location${count === 1 ? "" : "s"} now`}
    >
      {count}
    </Badge>
  );
}

/** "● LIVE · 4": the flooded locations on the map right now. */
function LiveTag() {
  const count = useLiveFloodCount();
  return (
    <span
      className="ml-auto inline-flex h-5 shrink-0 items-center gap-1.5 rounded-full border border-danger/40 bg-danger/12 px-1.5 text-[10px] font-bold uppercase tracking-wider text-danger"
      title={count === undefined ? "Live flood monitoring" : `Live: ${count} flooded location${count === 1 ? "" : "s"} now`}
    >
      <LiveDot />
      Live
      {count ? <span className="tabular-nums">· {count}</span> : null}
    </span>
  );
}

/** Reusable navigation link with icon, badge, and active state. */
export function NavigationItem({
  label,
  href,
  icon: Icon,
  active = false,
  collapsed = false,
  badge,
  nested = false,
  live = false,
  onNavigate,
}: NavigationItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={live ? `${label} · live flood monitoring` : label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-body transition-all duration-150",
        active
          ? "bg-primary/12 text-primary shadow-sm"
          : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-0",
        nested && !collapsed && "ml-2 pl-8",
      )}
    >
      <span className="relative shrink-0">
        <Icon
          className={cn(
            "size-[18px] transition-transform duration-150",
            active && "scale-105",
          )}
          aria-hidden
        />
        {live && collapsed ? <LiveDot className="absolute -right-1 -top-1" /> : null}
      </span>
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {live ? <LiveTag /> : null}
          {!live && badge !== undefined ? (
            <Badge
              variant="default"
              className="ml-auto h-5 min-w-5 justify-center px-1.5 text-label"
            >
              {badge}
            </Badge>
          ) : null}
        </>
      ) : null}
    </Link>
  );
}
