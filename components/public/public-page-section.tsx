import type { ReactNode } from "react";
import { PublicPageContainer } from "@/components/public/public-page-container";
import { cn } from "@/utils/cn";

interface PublicPageSectionProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  alternate?: boolean;
}

/** Content section — white or light gray DPWH GWT panel. */
export function PublicPageSection({
  children,
  className,
  containerClassName,
  alternate = false,
}: PublicPageSectionProps) {
  return (
    <section
      className={cn(
        "okb-public-section border-t py-16 sm:py-20",
        alternate ? "okb-public-section-alt" : undefined,
        className,
      )}
    >
      <PublicPageContainer className={cn("relative", containerClassName)}>
        {children}
      </PublicPageContainer>
    </section>
  );
}
