"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  Camera,
  Droplets,
  FileCheck2,
  FlaskConical,
  Landmark,
  Leaf,
  Mountain,
  Recycle,
  Scale,
  Search,
  Shield,
  Users,
  Waves,
} from "lucide-react";
import { FrameworkCycle } from "@/components/public/framework-cycle";
import { FrameworkRidgeToReef } from "@/components/public/framework-ridge-to-reef";
import { PublicPageSection } from "@/components/public/public-page-section";
import {
  FRAMEWORK_MECHANISM,
  FRAMEWORK_META,
  FRAMEWORK_OBJECTIVES,
  GOVERNANCE_ROLES,
  GUIDING_PRINCIPLES,
  INTERVENTION_SCOPES,
  MAINTENANCE_TYPES,
  PARTNERS,
  PERFORMANCE,
} from "@/lib/config/okb-framework";
import { FRAMEWORK_DOCUMENT_HREF, PUBLIC_ROUTES } from "@/lib/constants";

const PRINCIPLE_ICONS = [
  Mountain,
  Users,
  Shield,
  Recycle,
  Camera,
  FileCheck2,
  Leaf,
  Scale,
] as const;

const FRAMEWORK_HERO_BANNER = {
  src: "/framework/framework-hero-ridge-to-reef.png",
  alt: "Aerial ridge-to-reef landscape — a river winding from forested mountains through a floodplain to a coastal reef at dusk.",
} as const;

function FrameworkHeroBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="okb-fw-hero-photo pointer-events-none absolute inset-0"
        style={{ backgroundImage: `url(${FRAMEWORK_HERO_BANNER.src})` }}
      />
      <div
        aria-hidden
        className="okb-fw-hero-veil pointer-events-none absolute inset-0"
      />
      <svg
        aria-hidden
        className="okb-fw-hero-art pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 1440 820"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="okbFwHeroRiver" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7ec8ff" stopOpacity="0.15" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f57e20" stopOpacity="0.35" />
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#okbFwHeroRiver)" strokeLinecap="round">
          <path
            className="okb-fw-hero-flow"
            d="M-40 210 C180 140 320 280 520 220 C720 160 860 300 1100 210 C1260 150 1380 240 1500 180"
            strokeWidth="1.4"
          />
          <path
            className="okb-fw-hero-flow"
            d="M-40 310 C200 250 380 390 620 300 C860 210 980 400 1240 310 C1360 270 1460 330 1520 300"
            strokeWidth="2.2"
          />
          <path
            className="okb-fw-hero-flow"
            d="M-20 430 C220 360 400 520 680 430 C920 350 1080 540 1360 430"
            strokeWidth="1.1"
          />
        </g>
        <g
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          className="okb-fw-hero-topo"
        >
          <ellipse cx="1180" cy="150" rx="210" ry="78" />
          <ellipse cx="1180" cy="150" rx="150" ry="52" />
          <ellipse cx="1180" cy="150" rx="88" ry="28" />
          <ellipse cx="180" cy="620" rx="260" ry="90" />
          <ellipse cx="180" cy="620" rx="180" ry="58" />
        </g>
        <g fill="rgba(255,255,255,0.22)">
          <circle cx="210" cy="248" r="2.2" />
          <circle cx="540" cy="198" r="1.6" />
          <circle cx="890" cy="268" r="2" />
          <circle cx="1210" cy="188" r="1.8" />
          <circle cx="1040" cy="420" r="1.4" />
        </g>
      </svg>
      <div
        aria-hidden
        className="okb-fw-hero-sheen pointer-events-none absolute inset-0"
      />
      <span className="sr-only">{FRAMEWORK_HERO_BANNER.alt}</span>
    </>
  );
}

function FrameworkHeroCopy() {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="okb-fw-hero-panel"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="okb-public-eyebrow">{FRAMEWORK_META.authority}</p>
      <h1 className="okb-public-heading mt-3 max-w-4xl text-3xl sm:text-5xl lg:text-6xl">
        Operational Framework of Oplan Kontra Baha
      </h1>
      <span className="okb-fw-hero-rule mt-5 block" aria-hidden />
      <p className="okb-public-body mt-5 max-w-[46rem] text-base sm:text-lg">
        A regular, sustained flood-mitigation and maintenance program —
        restoring the carrying capacity of waterways, drainage, and flood
        facilities from ridge to reef.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={FRAMEWORK_DOCUMENT_HREF}
          download
          className="okb-public-btn okb-public-btn-accent"
        >
          <ArrowDownToLine className="size-4" aria-hidden />
          Download official memorandum
        </a>
        <Link
          href={PUBLIC_ROUTES.commandCenter}
          target="_blank"
          rel="noopener noreferrer"
          className="okb-public-btn okb-public-btn-light"
        >
          Open Command Center
        </Link>
      </div>
    </motion.div>
  );
}

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function OkbFrameworkStory() {
  return (
    <>
      <section className="okb-fw-hero relative isolate overflow-hidden">
        <FrameworkHeroBackdrop />

        <div className="okb-public-shell okb-fw-hero-copy relative z-10 pt-12 sm:pt-16">
          <FrameworkHeroCopy />
        </div>

        <div className="okb-public-shell relative z-10 mt-8 pb-0 sm:mt-10">
          <div className="okb-fw-scene-frame overflow-hidden rounded-t-sm border border-white/20 bg-white/10 shadow-lg">
            <FrameworkRidgeToReef />
          </div>
        </div>
      </section>

      <PublicPageSection containerClassName="space-y-6">
        <Reveal>
          <p className="okb-public-eyebrow">Policy basis</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            Institutionalized as standing operations
          </h2>
          <p className="okb-public-body okb-public-prose mt-4 text-base sm:text-lg">
            Issued {FRAMEWORK_META.dateIssued} under {FRAMEWORK_META.directive}{" "}
            and {FRAMEWORK_META.specialOrder}. OKB is the Department&apos;s
            coordinated, risk-based mechanism for identification, assessment,
            prioritization, implementation, monitoring, and sustained
            maintenance.
          </p>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {FRAMEWORK_MECHANISM.map((item, index) => (
            <Reveal key={item} delay={index * 0.05}>
              <div className="okb-public-card flex h-full flex-col justify-between rounded-sm p-4">
                <span className="okb-public-accent-blue text-xs font-bold">
                  0{index + 1}
                </span>
                <p className="okb-public-heading mt-3 text-base">{item}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection alternate containerClassName="space-y-10">
        <Reveal>
          <p className="okb-public-eyebrow">Guiding principles</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            Eight principles that hold the program together
          </h2>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {GUIDING_PRINCIPLES.map((principle, index) => {
            const Icon = PRINCIPLE_ICONS[index]!;
            return (
              <Reveal key={principle.id} delay={index * 0.04}>
                <article className="okb-public-card h-full rounded-sm p-6">
                  <div className="flex items-start gap-3">
                    <span className="okb-fw-icon-chip inline-flex size-11 shrink-0 items-center justify-center rounded-sm">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div>
                      <p className="okb-public-eyebrow">
                        Principle {principle.letter}
                      </p>
                      <h3 className="okb-public-heading mt-1 text-xl">
                        {principle.title}
                      </h3>
                    </div>
                  </div>
                  <p className="okb-public-body mt-4">{principle.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </PublicPageSection>

      <PublicPageSection containerClassName="space-y-8">
        <Reveal>
          <p className="okb-public-eyebrow">Objectives</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            What the framework is built to achieve
          </h2>
        </Reveal>

        <ol className="space-y-3">
          {FRAMEWORK_OBJECTIVES.map((objective, index) => (
            <Reveal key={objective} delay={index * 0.03}>
              <li className="okb-fw-objective flex gap-4 rounded-sm border border-[var(--dpwh-border)] bg-[var(--dpwh-panel)] p-4 sm:p-5">
                <span className="okb-public-heading text-2xl text-[var(--dpwh-orange)] sm:text-3xl">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="okb-public-body pt-1 text-base sm:text-lg">
                  {objective}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </PublicPageSection>

      <PublicPageSection alternate containerClassName="space-y-10">
        <Reveal>
          <p className="okb-public-eyebrow">Scope of interventions</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            Six fields of work on the ground
          </h2>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-2">
          {INTERVENTION_SCOPES.map((scope, index) => (
            <Reveal key={scope.id} delay={index * 0.05}>
              <article className="okb-public-card h-full rounded-sm p-6">
                <div className="mb-4 flex items-center gap-2">
                  {scope.id === "waterways" ? (
                    <Waves className="okb-public-icon size-6" aria-hidden />
                  ) : scope.id === "drainage" ? (
                    <Droplets className="okb-public-icon size-6" aria-hidden />
                  ) : scope.id === "facilities" ? (
                    <Activity className="okb-public-icon size-6" aria-hidden />
                  ) : scope.id === "waste" ? (
                    <Recycle className="okb-public-icon size-6" aria-hidden />
                  ) : scope.id === "monitoring" ? (
                    <Search className="okb-public-icon size-6" aria-hidden />
                  ) : (
                    <FlaskConical className="okb-public-icon size-6" aria-hidden />
                  )}
                  <h3 className="okb-public-heading text-xl">{scope.title}</h3>
                </div>
                <ul className="okb-public-body space-y-2 text-sm sm:text-base">
                  {scope.items.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <span
                        className="okb-public-dot mt-2 size-1.5 shrink-0 rounded-full"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="okb-public-body mt-4 border-t border-[var(--dpwh-border)] pt-4 text-sm">
                  {scope.note}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection containerClassName="space-y-10">
        <Reveal>
          <p className="okb-public-eyebrow">Governance</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            Command, coordination, and the field
          </h2>
        </Reveal>

        <div className="relative space-y-4">
          <div
            className="okb-fw-spine pointer-events-none absolute top-4 bottom-4 left-[1.15rem] w-px sm:left-6"
            aria-hidden
          />
          {GOVERNANCE_ROLES.map((role, index) => (
            <Reveal key={role.id} delay={index * 0.04}>
              <article className="relative grid gap-4 pl-12 sm:grid-cols-[14rem_1fr] sm:items-start sm:pl-16">
                <span className="okb-fw-node absolute top-2 left-0 size-9 rounded-full sm:size-12" />
                <h3 className="okb-public-heading text-lg sm:text-xl">{role.title}</h3>
                <p className="okb-public-body">{role.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection alternate containerClassName="space-y-10">
        <Reveal>
          <p className="okb-public-eyebrow">Operational cycle</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            From identification back to maintenance
          </h2>
          <p className="okb-public-body okb-public-prose mt-4">
            Hover or select a stage to walk the cycle used by District
            Engineering Offices, Regional Task Groups, and the OKB Task Force.
          </p>
        </Reveal>
        <FrameworkCycle />
      </PublicPageSection>

      <PublicPageSection containerClassName="space-y-10">
        <Reveal>
          <p className="okb-public-eyebrow">Performance</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            Outputs and outcomes, not headcount
          </h2>
          <p className="okb-public-body okb-public-prose mt-4">
            {PERFORMANCE.note}
          </p>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal>
            <article className="okb-public-card h-full rounded-sm p-6">
              <h3 className="okb-public-heading text-xl">Output indicators</h3>
              <ul className="mt-4 space-y-3">
                {PERFORMANCE.outputs.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="okb-fw-bar mt-2 h-2 w-10 shrink-0 rounded-full" />
                    <span className="okb-public-body">{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
          <Reveal delay={0.08}>
            <article className="okb-public-card h-full rounded-sm p-6">
              <h3 className="okb-public-heading text-xl">Outcome indicators</h3>
              <ul className="mt-4 space-y-3">
                {PERFORMANCE.outcomes.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="okb-fw-bar okb-fw-bar--outcome mt-2 h-2 w-10 shrink-0 rounded-full" />
                    <span className="okb-public-body">{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>
      </PublicPageSection>

      <PublicPageSection alternate containerClassName="space-y-10">
        <Reveal>
          <p className="okb-public-eyebrow">Preventive and periodic maintenance</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            Five rhythms of upkeep
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {MAINTENANCE_TYPES.map((item, index) => (
            <Reveal key={item.id} delay={index * 0.05}>
              <article className="okb-fw-season h-full rounded-sm p-5">
                <p className="text-xs font-bold tracking-[0.14em] text-[var(--dpwh-orange)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="okb-public-heading mt-3 text-lg">{item.title}</h3>
                <p className="okb-public-body mt-2 text-sm">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection containerClassName="space-y-10">
        <Reveal>
          <p className="okb-public-eyebrow">Whole-of-nation</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            Partners around the same waterway
          </h2>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {PARTNERS.map((partner, index) => (
            <Reveal key={partner.id} delay={index * 0.05}>
              <article className="okb-public-card flex h-full gap-4 rounded-sm p-6">
                <Landmark className="okb-public-icon mt-1 size-6 shrink-0" aria-hidden />
                <div>
                  <h3 className="okb-public-heading text-xl">{partner.title}</h3>
                  <p className="okb-public-body mt-2">{partner.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </PublicPageSection>

      <PublicPageSection alternate containerClassName="space-y-8">
        <Reveal>
          <p className="okb-public-eyebrow">Living framework</p>
          <h2 className="okb-public-heading mt-2 text-2xl sm:text-4xl">
            Data, review, and strict implementation
          </h2>
          <p className="okb-public-body okb-public-prose mt-4 text-base sm:text-lg">
            An OKB information and data-management system — including geospatial
            mapping — supports planning, resource allocation, and monitoring of
            recurring hotspots. The Task Force periodically evaluates
            implementation. This memorandum is the Department-wide framework for
            coordinated planning, prioritization, implementation, monitoring,
            evaluation, and sustained maintenance nationwide.
          </p>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="okb-fw-signoff rounded-sm p-6 sm:p-8">
            <p className="okb-public-body text-sm uppercase tracking-[0.16em] text-white/70">
              For information and strict implementation
            </p>
            <p className="okb-public-heading mt-4 text-2xl text-white sm:text-3xl">
              {FRAMEWORK_META.signedBy}
            </p>
            <p className="mt-1 text-white/85">{FRAMEWORK_META.signedTitle}</p>
            <p className="mt-4 text-sm text-white/65">
              {FRAMEWORK_META.dateIssued} · {FRAMEWORK_META.tracking}
            </p>
            <a
              href={FRAMEWORK_DOCUMENT_HREF}
              download
              className="okb-public-btn okb-public-btn-accent mt-6"
            >
              <ArrowDownToLine className="size-4" aria-hidden />
              Download the signed memorandum
            </a>
          </div>
        </Reveal>
      </PublicPageSection>
    </>
  );
}
