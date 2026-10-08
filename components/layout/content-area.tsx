import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ContentAreaProps {
  children: ReactNode;
  /** When true, children fill the main area without max-width padding. */
  /** true: no padding (map pages); "mobile": like that on phones only. */
  fullBleed?: boolean | "mobile";
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
        fullBleed === true
          ? "flex h-full min-h-0 flex-1 flex-col"
          : fullBleed === "mobile"
            ? // Full-bleed on phones only (a map-first phone layout), the padded page from sm up.
              "flex h-full min-h-0 flex-1 flex-col sm:mx-auto sm:block sm:h-auto sm:w-full sm:max-w-[1600px] sm:p-6"
            : "mx-auto w-full max-w-[1600px] p-4 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
