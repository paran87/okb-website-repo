"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Radio } from "lucide-react";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";

const HOME_HERO_BANNER = {
  src: "/home/metro-manila-flood-mitigation-banner.png",
  alt: "Oplan Kontra Baha Metro Manila flood mitigation and control project — drainage, dredging, pumping stations, floodgates, waste management, and relocation.",
} as const;

export function HomeHero() {
  const reduce = useReducedMotion();

  return (
    <section className="okb-public-hero-band okb-public-hero-band--with-image relative isolate overflow-hidden">
      <div
        aria-hidden
        className="okb-public-hero-bg-image pointer-events-none absolute inset-0"
        style={{ backgroundImage: `url(${HOME_HERO_BANNER.src})` }}
      />
      <div
        aria-hidden
        className="okb-public-hero-bg-overlay pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_80%_20%,rgba(255,255,255,0.1)_0%,transparent_55%)]"
      />

      <div className="okb-public-shell okb-public-hero-content relative z-10 flex min-h-[min(68vh,600px)] flex-col justify-center py-16 sm:py-20">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="okb-public-eyebrow">{APP.organization}</p>

          <h1 className="okb-public-heading mt-3 text-4xl leading-tight sm:text-5xl lg:text-6xl">
            {APP.program}
          </h1>

          <p className="okb-public-body okb-public-lead okb-public-prose mt-5">
            Protecting communities through flood-control infrastructure,
            nationwide monitoring, and coordinated emergency response.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={PUBLIC_ROUTES.about}
              className="okb-public-btn okb-public-btn-light"
            >
              Learn about the program
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href={PUBLIC_ROUTES.commandCenter}
              target="_blank"
              rel="noopener noreferrer"
              className="okb-public-btn okb-public-btn-accent"
            >
              <Radio className="size-4" aria-hidden />
              Enter OKB Command Center
            </Link>
          </div>
        </motion.div>
      </div>

      <span className="sr-only">{HOME_HERO_BANNER.alt}</span>
    </section>
  );
}
