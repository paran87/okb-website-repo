import { cn } from "@/utils/cn";

export const OKB_LOGO_SRC = "/brand/oplan-kontra-baha-logo.png";
export const OKB_LOGO_ALT = "Oplan Kontra Baha";

/** Native asset dimensions — keep in sync with public/brand/oplan-kontra-baha-logo.png */
const LOGO_WIDTH = 224;
const LOGO_HEIGHT = 254;

interface OkbLogoProps {
  /**
   * Display height in pixels (width scales with the hexagon aspect). Acts as a
   * fallback — a stylesheet may override it per breakpoint by setting
   * `--okb-logo-size` on the element.
   */
  size?: number;
  className?: string;
  priority?: boolean;
}

/** Official Oplan Kontra Baha hexagonal emblem. */
export function OkbLogo({ size = 44, className, priority = false }: OkbLogoProps) {
  return (
    // Plain img preserves PNG transparency; Next/Image optimization can flatten alpha.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={OKB_LOGO_SRC}
      alt={OKB_LOGO_ALT}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
      className={cn("h-auto w-auto shrink-0 object-contain", className)}
      style={{
        height: `var(--okb-logo-size, ${size}px)`,
        width: "auto",
        maxWidth: "100%",
      }}
    />
  );
}
