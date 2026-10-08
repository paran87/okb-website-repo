"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Radio } from "lucide-react";
import { FRAMEWORK_META, OPERATIONAL_CYCLE, PROGRAM_FOOTPRINT, RIDGE_TO_REEF_ZONES } from "@/lib/config/okb-framework";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";

const HOME_HERO_BANNER = {
  src: "/home/metro-manila-flood-mitigation-banner.png",
  alt: "Oplan Kontra Baha Metro Manila flood mitigation and control project — drainage, dredging, pumping stations, floodgates, waste management, and relocation.",
} as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

/** Program figures from the portfolio and the operational framework (never invented). */
const FACTS = [
  { value: PROGRAM_FOOTPRINT.launchCities, label: "Official launch cities", href: PUBLIC_ROUTES.profile },
  { value: PROGRAM_FOOTPRINT.softLaunchAreas, label: "Soft-launch areas", href: PUBLIC_ROUTES.profile },
  { value: RIDGE_TO_REEF_ZONES.length, label: "Ridge-to-reef zones", href: PUBLIC_ROUTES.framework },
  { value: OPERATIONAL_CYCLE.length, label: "Operational cycle stages", href: PUBLIC_ROUTES.framework },
] as const;

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
                <Link href={f.href} className="okb-home-fact">
                  <span className="okb-home-fact__value">{f.value}</span>
                  <span className="okb-home-fact__label">{f.label}</span>
                </Link>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        {/* Ridge to reef at a glance (desktop): the five zones the program works through. */}
        <motion.aside
          className="okb-home-zones hidden lg:block"
          initial={reduce ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Ridge to reef"
        >
          <p className="okb-home-zones__kicker">Ridge to reef</p>
          <ol className="mt-2 space-y-1.5">
            {RIDGE_TO_REEF_ZONES.map((z, i) => (
              <li key={z.id} className="okb-home-zone">
                <span className="okb-home-zone__num">{i + 1}</span>
                <span className="min-w-0">
                  <span className="okb-home-zone__label">{z.label}</span>
                  <span className="okb-home-zone__lead">{z.lead}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="okb-home-zones__foot">
            {FRAMEWORK_META.specialOrder} · issued {FRAMEWORK_META.dateIssued}
          </p>
        </motion.aside>
      </div>

      <span className="sr-only">{HOME_HERO_BANNER.alt}</span>
    </section>
  );
}
