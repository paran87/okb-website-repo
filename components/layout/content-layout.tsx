import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface ContentLayoutProps {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  padded?: boolean;
  className?: string;
}

const MAX_WIDTH: Record<NonNullable<ContentLayoutProps["maxWidth"]>, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-[1600px]",
  full: "max-w-none",
};

/** Standard page content container with responsive max-width. */
export function ContentLayout({
  children,
  maxWidth = "xl",
  padded = true,
  className,
}: ContentLayoutProps) {
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
