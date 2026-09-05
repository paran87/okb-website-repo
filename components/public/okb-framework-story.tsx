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
      <section className="okb-fw-hero relative overflow-hidden">
        <div className="okb-public-shell relative z-10 pt-10 sm:pt-14">
          <Reveal>
            <p className="okb-public-eyebrow text-white/80">
              {FRAMEWORK_META.authority}
            </p>
            <h1 className="okb-public-heading mt-3 max-w-4xl text-3xl text-white sm:text-5xl lg:text-6xl">
              Operational Framework of Oplan Kontra Baha
            </h1>
            <p className="okb-public-body mt-5 max-w-[72rem] text-base text-white/85 sm:text-lg">
              A regular, sustained flood-mitigation and maintenance program —
              restoring the carrying capacity of waterways, drainage, and flood
              facilities from ridge to reef.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
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
          </Reveal>
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
