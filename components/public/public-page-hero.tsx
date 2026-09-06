"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { PublicPageContainer } from "@/components/public/public-page-container";
import { APP } from "@/lib/constants";
import { cn } from "@/utils/cn";

interface PublicPageHeroBanner {
  src: string;
  alt: string;
}

interface PublicPageHeroProps {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
  bannerImage?: PublicPageHeroBanner;
  /** Decorative layer painted between the banner and the copy. */
  art?: ReactNode;
}

/** Ridge profile reused for every contour band in the hero artwork. */
const RIDGE_PATH =
  "M-60 268 C 140 214 260 96 470 152 C 660 202 790 272 990 250 C 1180 230 1300 286 1520 232";

const CONTOUR_OFFSETS = [-120, -84, -52, -22, 8, 40, 76] as const;

const FLOW_PATHS = [
  "M-40 44 C 180 14 300 70 480 42 C 660 14 790 66 970 40 C 1150 14 1290 60 1480 34",
  "M-40 70 C 170 42 310 96 486 70 C 664 44 786 92 966 68 C 1146 44 1286 86 1480 62",
  "M-40 96 C 160 70 320 122 496 98 C 674 74 796 118 976 96 C 1156 74 1296 112 1480 90",
] as const;

const containerVariants: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.08 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

/** Layered blue-band artwork: contours, survey grid, waterlines, sheen. */
function PageHeroArtwork() {
  return (
    <div className="okb-hero-art" aria-hidden>
      <span className="okb-hero-art__aurora" />
      <span className="okb-hero-art__grid" />

      <svg
        className="okb-hero-art__topo"
        viewBox="0 0 1440 300"
        preserveAspectRatio="none"
      >
        <g fill="none" stroke="#ffffff" strokeWidth="1.15" strokeLinecap="round">
          {CONTOUR_OFFSETS.map((offset, index) => (
            <path
              key={offset}
              d={RIDGE_PATH}
              transform={`translate(0 ${offset})`}
              opacity={0.6 - index * 0.06}
            />
          ))}
        </g>
      </svg>

      <svg
        className="okb-hero-art__flow"
        viewBox="0 0 1440 130"
        preserveAspectRatio="none"
      >
        <g fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round">
          {FLOW_PATHS.map((path, index) => (
            <path
              key={path}
              className="okb-hero-flowline"
              d={path}
              opacity={0.45 - index * 0.1}
              style={{ animationDelay: `${index * -3.1}s` }}
            />
          ))}
        </g>
      </svg>

      <span className="okb-hero-art__hatch" />
      <span className="okb-hero-art__grain" />
      <span className="okb-hero-art__vignette" />
    </div>
  );
}

/** Page intro band — DPWH blue poster with optional low-opacity photograph. */
export function PublicPageHero({
  eyebrow,
  title,
  description,
  children,
  bannerImage,
  art,
}: PublicPageHeroProps) {
  const reduce = useReducedMotion();

  return (
    <section
      className={cn(
        "okb-public-hero-band okb-page-hero relative isolate overflow-hidden",
        bannerImage && "okb-public-hero-band--with-image",
      )}
    >
      {bannerImage ? (
        <>
          <div
            aria-hidden
            className="okb-public-hero-bg-image pointer-events-none absolute inset-0"
            style={{ backgroundImage: `url(${bannerImage.src})` }}
          />
          <div
            aria-hidden
            className="okb-public-hero-bg-overlay pointer-events-none absolute inset-0"
          />
        </>
      ) : null}

      <PageHeroArtwork />

      {/* The wordmark only fills bands that have no photograph or motif of
          their own — over a banner it just competes with the image. */}
      {art ?? (bannerImage ? null : (
        <span className="okb-hero-watermark" aria-hidden>
          {APP.shortName}
        </span>
      ))}

      <PublicPageContainer className="okb-public-hero-content okb-page-hero-inner relative z-10">
        <motion.div
          variants={containerVariants}
          initial={reduce ? false : "hidden"}
          animate="show"
        >
          {eyebrow ? (
            <motion.p className="okb-hero-chip" variants={itemVariants}>
              <span className="okb-hero-chip__dot" aria-hidden />
              {eyebrow}
            </motion.p>
          ) : null}

          <motion.h1 className="okb-hero-title" variants={itemVariants}>
            {title}
          </motion.h1>

          <motion.span
            className="okb-hero-rule"
            variants={itemVariants}
            aria-hidden
          />

          <motion.p className="okb-hero-lead" variants={itemVariants}>
            {description}
          </motion.p>

          {children ? (
            <motion.div className="okb-hero-extra" variants={itemVariants}>
              {children}
            </motion.div>
          ) : null}
        </motion.div>
      </PublicPageContainer>

      {bannerImage ? (
        <span className="sr-only">{bannerImage.alt}</span>
      ) : null}
    </section>
  );
}
