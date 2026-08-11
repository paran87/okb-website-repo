"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

export interface NavigationItemProps {
  label: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
  collapsed?: boolean;
  badge?: string | number;
  nested?: boolean;
  onNavigate?: () => void;
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
  onNavigate,
}: NavigationItemProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
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
      <Icon
        className={cn(
          "size-[18px] shrink-0 transition-transform duration-150",
          active && "scale-105",
        )}
        aria-hidden
      />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {badge !== undefined ? (
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
