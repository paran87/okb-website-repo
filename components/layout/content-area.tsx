import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ContentAreaProps {
  children: ReactNode;
  /** When true, children fill the main area without max-width padding. */
  fullBleed?: boolean;
  className?: string;
}

/** Scrollable main content region inside the application shell. */
export function ContentArea({
  children,
  fullBleed = false,
  className,
}: ContentAreaProps) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1",
        fullBleed ? "flex h-full min-h-0 flex-1 flex-col" : "mx-auto w-full max-w-[1600px] p-4 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
