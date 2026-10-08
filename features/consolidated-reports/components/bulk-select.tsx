"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/cn";

/** Checked ids among [ids]; an item that leaves the list (deleted, refreshed away) drops out of the selection. */
export function useSelection(ids: string[]) {
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set());
  const selected = ids.filter((id) => checked.has(id));
  return {
    selected,
    isSelected: (id: string) => checked.has(id),
    toggle: (id: string) =>
      setChecked((s) => {
        const next = new Set(s);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setAll: (on: boolean) => setChecked(on ? new Set(ids) : new Set()),
    clear: () => setChecked(new Set()),
  };
}

export type Selection = ReturnType<typeof useSelection>;

/** One row's checkbox, with a 40 px tap area around the control. */
export function SelectBox({ id, label, selection, className }: { id: string; label: string; selection: Selection; className?: string }) {
  return (
    <Checkbox
      checked={selection.isSelected(id)}
      onChange={() => selection.toggle(id)}
      aria-label={label}
      className={cn("size-10 shrink-0 justify-center rounded-lg hover:bg-muted/40", className)}
    />
  );
}

/** Select all, with the count, and "Delete selected" once anything is checked. */
export function BulkBar({ total, selection, onDelete }: { total: number; selection: Selection; onDelete: () => void }) {
  const n = selection.selected.length;
  const all = n > 0 && n === total;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-card border px-1.5 py-1.5 text-caption",
        n > 0 ? "border-primary/50 bg-primary/5" : "border-border/70",
      )}
    >
      <Checkbox
        checked={all}
        ref={(el) => {
          if (el) el.indeterminate = n > 0 && !all;
        }}
        onChange={() => selection.setAll(!all)}
        label={n > 0 ? `${n} of ${total} selected` : "Select all"}
        className="min-h-10 rounded-lg px-2.5 text-caption font-semibold hover:bg-muted/40"
      />
      {n > 0 ? (
        <div className="ml-auto flex gap-2">
          <Button
            variant="ghost"
            size="md"
            onClick={selection.clear}
            className="justify-center text-caption font-semibold"
            leftIcon={<X className="size-4" aria-hidden />}
          >
            Clear
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={onDelete}
            className="justify-center text-caption font-semibold"
            leftIcon={<Trash2 className="size-4" aria-hidden />}
          >
            Delete {n}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
