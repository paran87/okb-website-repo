import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  padded?: boolean;
  className?: string;
}

const MAX_WIDTH: Record<NonNullable<PageContainerProps["maxWidth"]>, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-[1600px]",
  full: "max-w-none",
};

/** Standard page wrapper with responsive max-width and padding. */
export function PageContainer({
  children,
  maxWidth = "xl",
  padded = true,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        MAX_WIDTH[maxWidth],
        padded && "p-4 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
