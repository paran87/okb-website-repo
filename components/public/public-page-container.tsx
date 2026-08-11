import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PublicPageContainerProps {
  children: ReactNode;
  className?: string;
  /** Narrower column for long-form body copy. */
  narrow?: boolean;
}

/** Centered content shell for public site pages. */
export function PublicPageContainer({
  children,
  className,
  narrow = false,
}: PublicPageContainerProps) {
  return (
    <div
      className={cn(
        "w-full px-4 sm:px-6 lg:px-8",
        narrow ? "okb-public-container-narrow" : "okb-public-container",
        className,
      )}
    >
      {children}
    </div>
  );
}
