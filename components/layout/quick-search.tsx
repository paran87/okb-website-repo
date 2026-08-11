"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { flattenNavLinks, NAV_ITEMS } from "@/lib/config/navigation";
import { hasPermission } from "@/lib/rbac/permissions";
import { UserRole } from "@/lib/rbac/roles";
import { useUiStore } from "@/lib/store/ui.store";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { cn } from "@/utils/cn";

/** Command-palette style quick navigation across modules. */
export function QuickSearch() {
  const router = useRouter();
  const open = useUiStore((state) => state.quickSearchOpen);
  const openQuickSearch = useUiStore((state) => state.openQuickSearch);
  const closeQuickSearch = useUiStore((state) => state.closeQuickSearch);
  const [query, setQuery] = useState("");

  useKeyboardShortcut("k", openQuickSearch, { ctrlKey: true });
  useKeyboardShortcut("k", openQuickSearch, { metaKey: true });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const role = UserRole.ADMINISTRATOR;
  const links = flattenNavLinks(NAV_ITEMS).filter((item) =>
    hasPermission(role, item.permission),
  );
  const filtered = links.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <button
        type="button"
        onClick={openQuickSearch}
        aria-label="Quick search"
        className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-caption text-muted-foreground transition-colors hover:text-foreground md:flex"
      >
        <Search className="size-3.5" aria-hidden />
        <span>Quick search</span>
        <kbd className="ml-2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-label">
          Ctrl K
        </kbd>
      </button>

      <Modal
        open={open}
        onClose={closeQuickSearch}
        title="Quick Search"
        description="Jump to any module"
        size="md"
      >
        <input
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search modules…"
          className="mb-3 h-10 w-full rounded-lg border border-border bg-background px-3 text-body outline-none focus:border-ring focus:ring-2 focus:ring-ring/40"
        />
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onClick={() => {
                    router.push(item.href);
                    closeQuickSearch();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-body transition-colors hover:bg-muted",
                  )}
                >
                  <Icon className="size-4 text-primary" aria-hidden />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-caption text-muted-foreground">
              No modules match your search.
            </li>
          ) : null}
        </ul>
      </Modal>
    </>
  );
}
