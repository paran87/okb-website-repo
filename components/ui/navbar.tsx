"use client";

import type { ReactNode } from "react";
import { AppLogo } from "@/components/layout/app-logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/utils/cn";

interface NavbarProps {
  title?: ReactNode;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  showLogo?: boolean;
  showThemeToggle?: boolean;
  className?: string;
}

/**
 * Generic top navigation bar for command-center layouts.
 * The application shell uses this internally; feature pages can compose it
 * directly when a custom header is needed.
 */
export function Navbar({
  title,
  left,
  center,
  right,
  showLogo = false,
  showThemeToggle = true,
  className,
}: NavbarProps) {
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-header px-4 shadow-sidebar",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {showLogo ? <AppLogo /> : null}
        {left}
        {title ? (
          <h1 className="truncate text-subheading font-semibold text-foreground">
            {title}
          </h1>
        ) : null}
      </div>

      {center ? (
        <div className="hidden flex-1 justify-center md:flex">{center}</div>
      ) : null}

      <div className="flex shrink-0 items-center gap-2">
        {right}
        {showThemeToggle ? <ThemeToggle /> : null}
      </div>
    </header>
  );
}
