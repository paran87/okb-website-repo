"use client";

import type { ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Thin wrapper around next-themes so the rest of the app imports a stable local
 * module. Uses the `class` strategy (toggles `.dark` on <html>) and persists the
 * user's choice to localStorage.
 */
export function ThemeProvider(
  props: ComponentProps<typeof NextThemesProvider>,
) {
  return <NextThemesProvider {...props} />;
}
