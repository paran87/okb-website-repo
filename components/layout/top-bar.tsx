import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface TopBarProps {
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}

/** Secondary sticky bar below the main header for page-level controls. */
export function TopBar({ children, sticky = true, className }: TopBarProps) {
  return (
    <div
      className={cn(
        "border-b border-border bg-header/95 px-4 py-2 backdrop-blur-sm",
        sticky && "sticky top-0 z-20",
        className,
      )}
    >
      {children}
    </div>
  );
}
