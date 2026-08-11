"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { NavigationItem } from "@/components/layout/navigation-item";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

export interface NavigationChild {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
}

export interface NavigationGroupProps {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string | number;
  children: readonly NavigationChild[];
  expanded: boolean;
  collapsed: boolean;
  active?: boolean;
  onToggle: () => void;
  isChildActive: (href: string) => boolean;
  onNavigate?: () => void;
}

/** Expandable navigation group with animated children. */
export function NavigationGroup({
  id,
  label,
  icon: Icon,
  href,
  badge,
  children,
  expanded,
  collapsed,
  active = false,
  onToggle,
  isChildActive,
  onNavigate,
}: NavigationGroupProps) {
  const childActive = children.some((child) => isChildActive(child.href));

  if (collapsed) {
    return (
      <Link
        href={href ?? children[0]?.href ?? "#"}
        title={label}
        aria-current={active || childActive ? "page" : undefined}
        className={cn(
          "flex items-center justify-center rounded-lg px-0 py-2 transition-colors",
          active || childActive
            ? "bg-primary/12 text-primary"
            : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-[18px]" aria-hidden />
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        {href ? (
          <Link
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-body transition-colors",
              active || childActive
                ? "bg-primary/12 text-primary"
                : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
            {badge !== undefined ? (
              <Badge
                variant="default"
                className="ml-auto h-5 min-w-5 justify-center px-1.5 text-label"
              >
                {badge}
              </Badge>
            ) : null}
          </Link>
        ) : (
          <span
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-body",
              childActive ? "text-primary" : "text-sidebar-foreground",
            )}
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            <span className="truncate">{label}</span>
            {badge !== undefined ? (
              <Badge
                variant="default"
                className="ml-auto h-5 min-w-5 justify-center px-1.5 text-label"
              >
                {badge}
              </Badge>
            ) : null}
          </span>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`nav-group-${id}`}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${label}`}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform duration-200",
              expanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.ul
            id={`nav-group-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <li key={child.href}>
                <NavigationItem
                  label={child.label}
                  href={child.href}
                  icon={child.icon}
                  badge={child.badge}
                  nested
                  active={isChildActive(child.href)}
                  onNavigate={onNavigate}
                />
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
