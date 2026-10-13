import { OkbLogo } from "@/components/brand/okb-logo";
import { cn } from "@/utils/cn";

interface CommandWordmarkProps {
  /** `compact` fits the phone header; `full` adds the DPWH tagline for the sidebar. */
  variant?: "compact" | "full";
  /** Show the emblem with its radar sweep. */
  showEmblem?: boolean;
  /** Show the "OKB / Command Center" lettering. */
  showText?: boolean;
  /** Render the lettering as the page heading. */
  asHeading?: boolean;
  className?: string;
}

/**
 * OKB Command Center wordmark: the Oplan Kontra Baha emblem inside a slow
 * radar sweep, a gradient "OKB" with a live pulse, and "Command Center" over
 * a flowing water line. Animations stop under prefers-reduced-motion.
 */
export function CommandWordmark({
  variant = "compact",
  showEmblem = true,
  showText = true,
  asHeading = false,
  className,
}: CommandWordmarkProps) {
  const Title = asHeading ? "h1" : "p";

  return (
    <div className={cn("okb-cc-mark", `okb-cc-mark--${variant}`, className)}>
      {showEmblem ? (
        <span className="okb-cc-emblem" aria-hidden={showText}>
          <span className="okb-cc-emblem__sweep" />
          <span className="okb-cc-emblem__ripple" />
          <OkbLogo size={variant === "full" ? 34 : 28} className="okb-cc-emblem__logo" />
        </span>
      ) : null}

      {showText ? (
        <div className="okb-cc-text">
          <Title className="okb-cc-title" aria-label="OKB Command Center">
            <span className="okb-cc-title__okb" aria-hidden>
              OKB
            </span>
            <span className="okb-cc-live" aria-hidden>
              <span className="okb-cc-live__dot" />
              Live
            </span>
          </Title>
          <p className="okb-cc-sub" aria-hidden>
            Command Center
            <svg
              className="okb-cc-wave"
              viewBox="0 0 120 6"
              preserveAspectRatio="none"
              focusable="false"
            >
              <path d="M0 3 Q7.5 0 15 3 T30 3 T45 3 T60 3 T75 3 T90 3 T105 3 T120 3 T135 3 T150 3" />
            </svg>
          </p>
          {variant === "full" ? (
            <p className="okb-cc-tagline">DPWH · Oplan Kontra Baha</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
