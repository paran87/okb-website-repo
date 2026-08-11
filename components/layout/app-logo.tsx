import { OkbLogo } from "@/components/brand/okb-logo";
import { cn } from "@/utils/cn";

interface AppLogoProps {
  showText?: boolean;
  className?: string;
}

/**
 * DPWH / OKB brand mark using the official Oplan Kontra Baha emblem.
 */
export function AppLogo({ showText = true, className }: AppLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <OkbLogo size={showText ? 40 : 36} className="shrink-0" />
      {showText ? (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-body font-semibold text-foreground">
            OKB Command Center
          </p>
          <p className="truncate text-label text-muted-foreground">
            DPWH · Oplan Kontra Baha
          </p>
        </div>
      ) : null}
    </div>
  );
}

