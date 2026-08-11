"use client";

import { useEffect } from "react";

interface KeyboardShortcutOptions {
  enabled?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/** Register a global keyboard shortcut. */
export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options: KeyboardShortcutOptions = {},
): void {
  const {
    enabled = true,
    metaKey = false,
    ctrlKey = false,
    shiftKey = false,
    altKey = false,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      if (
        event.key.toLowerCase() === key.toLowerCase() &&
        event.metaKey === metaKey &&
        event.ctrlKey === ctrlKey &&
        event.shiftKey === shiftKey &&
        event.altKey === altKey
      ) {
        event.preventDefault();
        handler();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [key, handler, enabled, metaKey, ctrlKey, shiftKey, altKey]);
}
