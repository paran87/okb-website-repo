import type { ReactNode } from "react";
import { PublicPageContainer } from "@/components/public/public-page-container";

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
}

/** Page intro band — DPWH blue banner with optional low-opacity background image. */
export function PublicPageHero({
  eyebrow,
  title,
  description,
  children,
  bannerImage,
}: PublicPageHeroProps) {
  return (
    <section
      className={`okb-public-hero-band relative overflow-hidden pt-28 pb-12 sm:pt-32 sm:pb-14${bannerImage ? " okb-public-hero-band--with-image" : ""}`}
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_100%_0%,rgba(255,255,255,0.1)_0%,transparent_50%)]"
      />
      <PublicPageContainer className="okb-public-hero-content relative z-10">
        {eyebrow ? <p className="okb-public-eyebrow">{eyebrow}</p> : null}
        <h1 className="okb-public-heading mt-2 text-3xl sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="okb-public-body okb-public-lead okb-public-prose mt-4">
          {description}
        </p>
        {children ? <div className="mt-6">{children}</div> : null}
      </PublicPageContainer>
      {bannerImage ? (
        <span className="sr-only">{bannerImage.alt}</span>
      ) : null}
    </section>
  );
}
