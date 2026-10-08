"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Radio } from "lucide-react";
import { COVERAGE, COVERAGE_AS_OF, COVERAGE_TOTALS, regionDrainage, regionWaterways } from "@/lib/config/okb-coverage";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";

const HOME_HERO_BANNER = {
  src: "/photos/aerial-river-dredging.webp",
  alt: "Aerial view of an Oplan Kontra Baha dredging site: excavators and dump trucks on a newly reinforced riverbank where a wide river meets a tributary, with farmland and hills beyond.",
} as const;

const COVERAGE_HREF = `${PUBLIC_ROUTES.accomplishment}#coverage`;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/** Program coverage from the accomplishment reports (counts of places, never progress figures). */
const FACTS = [
  { value: COVERAGE_TOTALS.regions, label: "Regions" },
  { value: COVERAGE_TOTALS.areas, label: "Provinces & cities" },
  { value: COVERAGE_TOTALS.waterways, label: "Waterways" },
  { value: COVERAGE_TOTALS.drainage, label: "Drainage lines" },
] as const;

/** The regions with the most work sites, for the desktop "Where we work" card. */
const TOP_REGIONS = [...COVERAGE]
  .sort((a, b) => regionWaterways(b) + regionDrainage(b) - (regionWaterways(a) + regionDrainage(a)))
  .slice(0, 6);

/** Home intro: the Metro Manila flood-mitigation illustration under a poster headline, with the program in brief. */
export function HomeHero() {
  const reduce = useReducedMotion();

  return (
    <section className="okb-home-hero relative isolate overflow-hidden">
      <div aria-hidden className="okb-home-hero__image pointer-events-none absolute inset-0" style={{ backgroundImage: `url(${HOME_HERO_BANNER.src})` }} />
      <div aria-hidden className="okb-home-hero__veil pointer-events-none absolute inset-0" />
      <div aria-hidden className="okb-home-hero__grid pointer-events-none absolute inset-0" />

      <div className="okb-public-shell relative z-10 grid items-center gap-6 py-7 sm:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 lg:py-12">
        <motion.div variants={container} initial={reduce ? false : "hidden"} animate="show">
          <motion.p className="okb-hero-chip" variants={item}>
            <span className="okb-hero-chip__dot" aria-hidden />
            {APP.organization}
          </motion.p>

          <motion.h1 className="okb-home-title" variants={item}>
            Oplan <span className="okb-home-title__accent">Kontra Baha</span>
          </motion.h1>

          <motion.span className="okb-hero-rule" variants={item} aria-hidden />

          <motion.p className="okb-home-lead" variants={item}>
            A sustained, national flood-mitigation program — restoring the carrying capacity of waterways, drainage and
            flood facilities <em>from ridge to reef</em>, with live monitoring and coordinated response.
          </motion.p>

          <motion.div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap" variants={item}>
            <Link href={PUBLIC_ROUTES.framework} className="okb-home-btn okb-home-btn--ghost">
              Explore the framework
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link href={PUBLIC_ROUTES.commandCenter} className="okb-home-btn okb-home-btn--solid">
              <Radio className="size-4" aria-hidden />
              Enter OKB Command Center
            </Link>
          </motion.div>

          <motion.ul className="okb-home-facts" variants={item} aria-label="The program in figures">
            {FACTS.map((f) => (
              <li key={f.label}>
                <Link href={COVERAGE_HREF} className="okb-home-fact">
                  <span className="okb-home-fact__value">{f.value}</span>
                  <span className="okb-home-fact__label">{f.label}</span>
                </Link>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Where we work (desktop): the regions with the most waterways and drainage lines. */}
        <motion.aside
          className="okb-home-zones hidden lg:block"
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Where we work"
        >
          <p className="okb-home-zones__kicker">Where we work</p>
          <ol className="mt-2 space-y-1">
            {TOP_REGIONS.map((r) => (
              <li key={r.id}>
                <Link href={`${PUBLIC_ROUTES.accomplishment}#coverage-${r.id}`} className="okb-home-zone">
                  <span className="okb-home-zone__num okb-home-zone__num--code">{r.code.replace("Region ", "")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="okb-home-zone__label">{r.name}</span>
                    <span className="okb-home-zone__lead">{r.areas.map((a) => a.name).join(" · ")}</span>
                  </span>
                  <span className="okb-home-zone__count">
                    {regionWaterways(r) + regionDrainage(r)}
                    <span>sites</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <Link href={COVERAGE_HREF} className="okb-home-zones__foot okb-home-zones__foot--link">
            All {COVERAGE_TOTALS.regions} regions · as of {COVERAGE_AS_OF} →
          </Link>
        </motion.aside>
      </div>

      <span className="sr-only">{HOME_HERO_BANNER.alt}</span>
    </section>
  );
}
