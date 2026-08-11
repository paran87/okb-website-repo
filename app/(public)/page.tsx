"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Shield, Siren, Waves } from "lucide-react";
import { HomeHero, PublicPageSection } from "@/components/public";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";

const pillars = [
  {
    icon: Waves,
    title: "Flood-control infrastructure",
    body: "Drainage systems, floodways, pump stations, and river improvement projects engineered for monsoon and typhoon seasons.",
  },
  {
    icon: Shield,
    title: "Prepared communities",
    body: "Early coordination with LGUs, clear public advisories, and assets staged where flood risk is highest.",
  },
  {
    icon: Siren,
    title: "Live operations",
    body: "The OKB Command Center unifies monitoring, incidents, equipment, and weather into one national picture.",
  },
] as const;

export default function HomePage() {
  const reduce = useReducedMotion();

  return (
    <>
      <HomeHero />

      <PublicPageSection>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="okb-public-eyebrow">Why it exists</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-3xl lg:text-4xl">
            One national program against flood risk
          </h2>
          <p className="okb-public-body okb-public-prose mt-4 text-base sm:text-lg">
            {APP.program} brings DPWH flood-control works, field operations, and
            real-time situational awareness under a single mission: keep people,
            roads, and communities moving when the waters rise.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={reduce ? false : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.5,
                  delay: reduce ? 0 : index * 0.08,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="okb-public-card h-full rounded-sm p-6"
              >
                <Icon className="okb-public-icon size-7" aria-hidden />
                <h3 className="okb-public-heading mt-4 text-lg">
                  {pillar.title}
                </h3>
                <p className="okb-public-body mt-2 text-sm sm:text-base">
                  {pillar.body}
                </p>
              </motion.div>
            );
          })}
        </div>
      </PublicPageSection>

      <PublicPageSection alternate className="border-t-0">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="okb-public-eyebrow">Operations desk</p>
            <h2 className="okb-public-heading mt-2 text-2xl sm:text-3xl lg:text-4xl">
              OKB Command Center
            </h2>
            <p className="okb-public-body okb-public-prose mt-4 text-base sm:text-lg">
              Authorized personnel can open the live GIS command-and-control
              platform for flood monitoring, incidents, equipment, and regional
              coordination.
            </p>
          </div>
          <Link
            href={PUBLIC_ROUTES.commandCenter}
            target="_blank"
            rel="noopener noreferrer"
            className="okb-public-btn okb-public-btn-accent shrink-0 self-start lg:self-center"
          >
            Open Command Center
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
      </PublicPageSection>
    </>
  );
}
