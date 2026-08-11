"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { NavigationGroup } from "@/components/layout/navigation-group";
import { NavigationItem } from "@/components/layout/navigation-item";
import { SidebarFooter } from "@/components/layout/sidebar-footer";
import { NAV_ITEMS, type NavEntry } from "@/lib/config/navigation";
import { ROUTES } from "@/lib/constants";
import { hasPermission } from "@/lib/rbac/permissions";
import { UserRole } from "@/lib/rbac/roles";
import { useUiStore } from "@/lib/store/ui.store";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { cn } from "@/utils/cn";

function useVisibleNavItems() {
  const role = UserRole.ADMINISTRATOR;
  return NAV_ITEMS.filter((item) => hasPermission(role, item.permission));
}

function isLinkActive(pathname: string, href: string): boolean {
  // Dashboard lives at /command — do not treat every /command/* route as active.
  if (href === ROUTES.dashboard) {
    return pathname === ROUTES.dashboard || pathname === ROUTES.dashboardAlt;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(pathname: string, entry: Extract<NavEntry, { type: "group" }>): boolean {
  if (entry.href && isLinkActive(pathname, entry.href)) return true;
  return entry.children.some((child) => isLinkActive(pathname, child.href));
}

function NavTree({
  items,
  collapsed,
  onNavigate,
}: {
  items: readonly NavEntry[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const expandedNavGroups = useUiStore((state) => state.expandedNavGroups);
  const toggleNavGroup = useUiStore((state) => state.toggleNavGroup);
  const setNavGroupExpanded = useUiStore((state) => state.setNavGroupExpanded);

  useEffect(() => {
    for (const item of items) {
      if (item.type === "group" && isGroupActive(pathname, item)) {
        setNavGroupExpanded(item.label, true);
      }
    }
  }, [pathname, items, setNavGroupExpanded]);

  return (
    <ul className="space-y-1 px-2">
      {items.map((item) => {
        if (item.type === "link") {
          return (
            <li key={item.href}>
              <NavigationItem
                label={item.label}
                href={item.href}
                icon={item.icon}
                badge={item.badge}
                collapsed={collapsed}
                active={isLinkActive(pathname, item.href)}
                onNavigate={onNavigate}
              />
            </li>
          );
        }

        const expanded = expandedNavGroups[item.label] ?? false;

        return (
          <li key={item.label}>
            <NavigationGroup
              id={item.label}
              label={item.label}
              icon={item.icon}
              href={item.href}
              badge={item.badge}
              children={item.children}
              expanded={expanded}
              collapsed={collapsed}
              active={item.href ? isLinkActive(pathname, item.href) : false}
              onToggle={() => toggleNavGroup(item.label)}
              isChildActive={(href) => isLinkActive(pathname, href)}
              onNavigate={onNavigate}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Desktop collapsible rail + mobile slide-in drawer with nested navigation. */
export function Sidebar() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggle = useUiStore((state) => state.toggleSidebar);
  const mobileOpen = useUiStore((state) => state.mobileSidebarOpen);
  const closeMobile = useUiStore((state) => state.closeMobileSidebar);
  const items = useVisibleNavItems();

  useKeyboardShortcut("b", toggle, { ctrlKey: true });
  useKeyboardShortcut("b", toggle, { metaKey: true });

  return (
    <>
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-border px-3",
            collapsed && "justify-center px-0",
          )}
        >
          <AppLogo showText={!collapsed} />
        </div>
        <nav aria-label="Primary" className="flex-1 overflow-y-auto py-3">
          <NavTree items={items} collapsed={collapsed} />
        </nav>
        <SidebarFooter collapsed={collapsed} onToggle={toggle} />
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobile}
            />
            <motion.aside
              className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22, ease: "easeInOut" }}
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-3">
                <AppLogo />
                <button
                  type="button"
                  onClick={closeMobile}
                  aria-label="Close navigation"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              <nav
                aria-label="Primary mobile"
                className="flex-1 overflow-y-auto py-3"
              >
                <NavTree
                  items={items}
                  collapsed={false}
                  onNavigate={closeMobile}
                />
              </nav>
              <div className="border-t border-border p-3">
                <Link
                  href="/settings"
                  onClick={closeMobile}
                  className="text-caption text-muted-foreground hover:text-foreground"
                >
                  Settings
                </Link>
              </div>
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
