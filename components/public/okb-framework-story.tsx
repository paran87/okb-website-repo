"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { MotionConfig, motion, type Variants } from "framer-motion";
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Camera,
  ClipboardCheck,
  ClipboardList,
  CalendarClock,
  CloudRain,
  FileCheck2,
  Flag,
  Gauge,
  Handshake,
  HardHat,
  Home,
  Landmark,
  Leaf,
  ListOrdered,
  Map as MapIcon,
  MapPinned,
  Mountain,
  Radar,
  Recycle,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Siren,
  Sparkles,
  Users,
  Waves,
  Wind,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { FrameworkChapterNav, scrollToChapter, type FrameworkChapter } from "@/components/public/framework-chapter-nav";
import { FrameworkCycle } from "@/components/public/framework-cycle";
import { FrameworkRidgeToReef } from "@/components/public/framework-ridge-to-reef";
import { FrameworkScopeTabs } from "@/components/public/framework-scope-tabs";
import { PublicPageSection } from "@/components/public/public-page-section";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  FRAMEWORK_MECHANISM,
  FRAMEWORK_META,
  FRAMEWORK_OBJECTIVES,
  GOVERNANCE_ROLES,
  GUIDING_PRINCIPLES,
  INTERVENTION_SCOPES,
  MAINTENANCE_TYPES,
  OPERATIONAL_CYCLE,
  PARTNERS,
  PERFORMANCE,
} from "@/lib/config/okb-framework";
import { FRAMEWORK_DOCUMENT_HREF, PUBLIC_ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";

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

const SECRETARY_PORTRAIT = {
  src: "/framework/sec-vivencio-dizon.jpg",
  alt: "Secretary Vivencio B. Dizon of the Department of Public Works and Highways, photographed during a Senate Blue Ribbon Committee hearing. Public-domain photograph by the Philippine government, via Wikimedia Commons.",
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
        className="okb-fw-hero-emblem pointer-events-none absolute"
      />
      <div
        aria-hidden
        className="okb-fw-hero-sheen pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="okb-fw-hero-vignette pointer-events-none absolute inset-0"
      />
      <span className="sr-only">{FRAMEWORK_HERO_BANNER.alt}</span>
    </>
  );
}

const heroPanelVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
};

const heroItemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

/** Document facts shown as a spec strip under the lead paragraph. */
const HERO_META_FIELDS = [
  { label: "Issued", value: FRAMEWORK_META.dateIssued },
  { label: "Special Order", value: "No. 06, s. 2026" },
  { label: "Reference", value: FRAMEWORK_META.tracking },
] as const;

function FrameworkHeroCopy() {
  return (
    <motion.div
      className="okb-fw-hero-panel"
      variants={heroPanelVariants}
      initial="hidden"
      animate="show"
    >
      <span className="okb-fw-hero-tick okb-fw-hero-tick--tl" aria-hidden />
      <span className="okb-fw-hero-tick okb-fw-hero-tick--tr" aria-hidden />
      <span className="okb-fw-hero-tick okb-fw-hero-tick--bl" aria-hidden />
      <span className="okb-fw-hero-tick okb-fw-hero-tick--br" aria-hidden />

      <motion.p className="okb-fw-hero-badge" variants={heroItemVariants}>
        <Landmark className="size-3.5 shrink-0" aria-hidden />
        <span>{FRAMEWORK_META.authority}</span>
      </motion.p>

      <h1 className="okb-fw-hero-title">
        <motion.span className="okb-fw-hero-title__line" variants={heroItemVariants}>
          Operational Framework
        </motion.span>{" "}
        <motion.span
          className="okb-fw-hero-title__line okb-fw-hero-title__accent"
          variants={heroItemVariants}
        >
          of Oplan Kontra Baha
        </motion.span>
      </h1>

      <motion.span className="okb-fw-hero-rule" variants={heroItemVariants} aria-hidden />

      <motion.p className="okb-fw-hero-lead" variants={heroItemVariants}>
        A regular, sustained flood-mitigation and maintenance program —
        restoring the carrying capacity of waterways, drainage, and flood
        facilities <em>from ridge to reef</em>.
      </motion.p>

      <motion.div className="okb-fw-hero-actions" variants={heroItemVariants}>
        <a
          href={FRAMEWORK_DOCUMENT_HREF}
          download
          className="okb-fw-btn okb-fw-btn--solid"
        >
          <ArrowDownToLine className="okb-fw-btn__icon size-4 shrink-0" aria-hidden />
          <span>Download official memorandum</span>
          <span className="okb-fw-btn__shine" aria-hidden />
        </a>
        <Link
          href={PUBLIC_ROUTES.commandCenter}
          className="okb-fw-btn okb-fw-btn--ghost"
        >
          <span>Open Command Center</span>
          <ArrowUpRight className="okb-fw-btn__icon size-4 shrink-0" aria-hidden />
        </Link>
      </motion.div>

      <motion.dl className="okb-fw-hero-meta" variants={heroItemVariants}>
        {HERO_META_FIELDS.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </motion.dl>
    </motion.div>
  );
}


function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** "li" when the reveal is itself a list item. */
  as?: "div" | "li";
}) {
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}

const CHAPTERS = [
  { id: "basis", label: "Policy basis" },
  { id: "principles", label: "Principles" },
  { id: "objectives", label: "Objectives" },
  { id: "scope", label: "Fields of work" },
  { id: "governance", label: "Governance" },
  { id: "cycle", label: "Cycle" },
  { id: "performance", label: "Performance" },
  { id: "maintenance", label: "Maintenance" },
  { id: "partners", label: "Partners" },
  { id: "signoff", label: "Sign-off" },
] as const satisfies readonly FrameworkChapter[];

type ChapterId = (typeof CHAPTERS)[number]["id"];
const chapterNo = (id: ChapterId) => String(CHAPTERS.findIndex((c) => c.id === id) + 1).padStart(2, "0");

/** Chapter heading: number chip + eyebrow, display title, optional lead. */
function ChapterHeading({ id, eyebrow, title, lead }: { id: ChapterId; eyebrow: string; title: ReactNode; lead?: ReactNode }) {
  return (
    <Reveal>
      <p className="okb-fw-kicker">
        <span className="okb-fw-kicker__num">{chapterNo(id)}</span>
        <span className="okb-public-eyebrow">{eyebrow}</span>
      </p>
      <h2 className="okb-fw-title mt-3">{title}</h2>
      {lead ? <p className="okb-fw-lead mt-3">{lead}</p> : null}
    </Reveal>
  );
}

const GLANCE: { value: number; label: string; to: ChapterId }[] = [
  { value: GUIDING_PRINCIPLES.length, label: "Guiding principles", to: "principles" },
  { value: FRAMEWORK_OBJECTIVES.length, label: "Objectives", to: "objectives" },
  { value: INTERVENTION_SCOPES.length, label: "Fields of work", to: "scope" },
  { value: GOVERNANCE_ROLES.length, label: "Command levels", to: "governance" },
  { value: OPERATIONAL_CYCLE.length, label: "Cycle stages", to: "cycle" },
  { value: MAINTENANCE_TYPES.length, label: "Upkeep rhythms", to: "maintenance" },
];

const MECHANISM_ICONS: LucideIcon[] = [Search, ClipboardCheck, ListOrdered, HardHat, Radar, RefreshCw];

/** Governance roles grouped into tiers; the first role of each tier leads it. */
const TIERS: { level: string; name: string; roles: (typeof GOVERNANCE_ROLES)[number]["id"][] }[] = [
  { level: "Tier 1", name: "National command", roles: ["secretary", "task-force", "commander", "secretariat"] },
  { level: "Tier 2", name: "Regional", roles: ["regional"] },
  { level: "Tier 3", name: "Field", roles: ["district"] },
  { level: "Support", name: "Department-wide", roles: ["bureaus"] },
];

const ROLE_ICONS: Record<(typeof GOVERNANCE_ROLES)[number]["id"], LucideIcon> = {
  secretary: Landmark,
  "task-force": ShieldCheck,
  commander: Flag,
  secretariat: ClipboardList,
  regional: MapPinned,
  district: HardHat,
  bureaus: Wrench,
};

const RHYTHM_UI: Record<(typeof MAINTENANCE_TYPES)[number]["id"], { icon: LucideIcon; when: string }> = {
  routine: { icon: CalendarClock, when: "On schedule" },
  "pre-rainy": { icon: CloudRain, when: "Before the rains" },
  "post-event": { icon: Wind, when: "After typhoons" },
  condition: { icon: Gauge, when: "At critical levels" },
  urgent: { icon: Siren, when: "Immediately" },
};

const PARTNER_ICONS: Record<(typeof PARTNERS)[number]["id"], LucideIcon> = {
  dpwh: Building2,
  lgu: Home,
  nga: Landmark,
  private: Handshake,
};

const PILLARS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: MapIcon, title: "Data and geospatial mapping", body: "Planning, resources, and recurring hotspots" },
  { icon: BarChart3, title: "Periodic evaluation", body: "The Task Force reviews implementation" },
  { icon: FileCheck2, title: "One framework nationwide", body: "Planning through sustained maintenance" },
];

function GlanceTiles() {
  const reduce = useMediaQuery("(prefers-reduced-motion: reduce)") === true;
  return (
    <div className="okb-fw-glance">
      {GLANCE.map((g, i) => (
        <Reveal key={g.to} delay={i * 0.04}>
          <a
            href={`#${g.to}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToChapter(g.to, reduce);
            }}
            className="okb-fw-glance__tile h-full"
          >
            <span className="okb-fw-glance__num">{g.value}</span>
            <span className="okb-fw-glance__label">{g.label}</span>
          </a>
        </Reveal>
      ))}
    </div>
  );
}

export function OkbFrameworkStory() {
  return (
    <MotionConfig reducedMotion="user">
      <section className="okb-fw-hero relative isolate overflow-hidden">
        <FrameworkHeroBackdrop />

        <div className="okb-public-shell okb-fw-hero-copy relative z-10 pt-5 sm:pt-8">
          <FrameworkHeroCopy />
        </div>

        <div className="okb-public-shell relative z-10 mt-5 pb-0 sm:mt-8">
          <div className="okb-fw-scene-frame overflow-hidden rounded-t-sm border border-white/20 bg-white/10 shadow-lg">
            <FrameworkRidgeToReef />
          </div>
        </div>
      </section>

      <FrameworkChapterNav chapters={CHAPTERS} />

      {/* 01 Policy basis */}
      <PublicPageSection id="basis" className="border-t-0 py-12 sm:py-16" containerClassName="space-y-8 sm:space-y-10">
        <GlanceTiles />
        <ChapterHeading
          id="basis"
          eyebrow="Policy basis"
          title={
            <>
              Institutionalized as <em>standing operations</em>
            </>
          }
          lead={
            <>
              Issued {FRAMEWORK_META.dateIssued} under {FRAMEWORK_META.directive} and {FRAMEWORK_META.specialOrder}. OKB
              is the Department&apos;s coordinated, risk-based mechanism — from finding a problem to keeping it fixed.
            </>
          }
        />
        <Reveal>
          <ol className="okb-fw-flow" aria-label="The OKB mechanism">
            {FRAMEWORK_MECHANISM.map((step, i) => {
              const Icon = MECHANISM_ICONS[i]!;
              return (
                <li key={step} className="okb-fw-flow__step">
                  <span className="okb-fw-flow__node">
                    <Icon className="size-6" aria-hidden />
                    <span className="okb-fw-flow__badge">{i + 1}</span>
                  </span>
                  <span className="okb-fw-flow__label">{step}</span>
                </li>
              );
            })}
          </ol>
        </Reveal>
      </PublicPageSection>

      {/* 02 Principles */}
      <PublicPageSection id="principles" className="okb-fw-dark" containerClassName="space-y-8 sm:space-y-10">
        <ChapterHeading
          id="principles"
          eyebrow="Guiding principles"
          title={
            <>
              Eight principles that <em>hold the program together</em>
            </>
          }
          lead="Every OKB decision — where to work, how, and with whom — is tested against these principles from the memorandum."
        />
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {GUIDING_PRINCIPLES.map((principle, index) => {
            const Icon = PRINCIPLE_ICONS[index]!;
            return (
              <Reveal key={principle.id} delay={(index % 4) * 0.05}>
                <article className="okb-fw-principle">
                  <span className="okb-fw-principle__letter" aria-hidden>
                    {principle.letter}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="okb-fw-principle__icon">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <p className="okb-fw-principle__tag">Principle {principle.letter}</p>
                  </div>
                  <h3 className="okb-fw-principle__title mt-3">{principle.title}</h3>
                  <p className="okb-fw-principle__body mt-2">{principle.body}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </PublicPageSection>

      {/* 03 Objectives */}
      <PublicPageSection id="objectives" containerClassName="space-y-8 sm:space-y-10">
        <ChapterHeading
          id="objectives"
          eyebrow="Objectives"
          title={
            <>
              What the framework is <em>built to achieve</em>
            </>
          }
        />
        <ol className="okb-fw-goals">
          {FRAMEWORK_OBJECTIVES.map((objective, index) => (
            <Reveal as="li" key={objective} delay={(index % 2) * 0.05} className="okb-fw-goal">
              <span className="okb-fw-goal__num">{String(index + 1).padStart(2, "0")}</span>
              <p className="okb-fw-goal__text">{objective}</p>
            </Reveal>
          ))}
        </ol>
      </PublicPageSection>

      {/* 04 Fields of work */}
      <PublicPageSection id="scope" alternate containerClassName="space-y-8 sm:space-y-10">
        <ChapterHeading
          id="scope"
          eyebrow="Scope of interventions"
          title={
            <>
              Six fields of work <em>on the ground</em>
            </>
          }
          lead="Tap a field to see what crews do there and the equipment they bring."
        />
        <Reveal>
          <FrameworkScopeTabs />
        </Reveal>
      </PublicPageSection>

      {/* 05 Governance */}
      <PublicPageSection id="governance" containerClassName="space-y-8 sm:space-y-10">
        <ChapterHeading
          id="governance"
          eyebrow="Governance"
          title={
            <>
              Command, coordination, <em>and the field</em>
            </>
          }
          lead="Clear lines from the Secretary to the District Engineering Offices doing the work, with support across the Department."
        />
        <div className="okb-fw-tiers">
          {TIERS.map((tier) => (
            <Reveal key={tier.name}>
              <div className="okb-fw-tier">
                <div className="okb-fw-tier__label">
                  <span className="okb-fw-tier__level">{tier.level}</span>
                  <span className="okb-fw-tier__name">{tier.name}</span>
                  <span className="okb-fw-tier__rule" aria-hidden />
                </div>
                <div className={cn("okb-fw-tier__cards", tier.roles.length > 1 && "okb-fw-tier__cards--multi")}>
                  {tier.roles.map((id, i) => {
                    const role = GOVERNANCE_ROLES.find((r) => r.id === id)!;
                    const Icon = ROLE_ICONS[id];
                    return (
                      <article key={id} className={cn("okb-fw-role", i === 0 && "okb-fw-role--lead")}>
                        <span className="okb-fw-role__icon">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <h3 className="okb-fw-role__title">{role.title}</h3>
                          <p className="okb-fw-role__body">{role.body}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </PublicPageSection>

      {/* 06 Cycle */}
      <PublicPageSection id="cycle" alternate containerClassName="space-y-8 sm:space-y-10">
        <ChapterHeading
          id="cycle"
          eyebrow="Operational cycle"
          title={
            <>
              From identification <em>back to maintenance</em>
            </>
          }
          lead="Tap a stage to walk the cycle used by District Engineering Offices, Regional Task Groups, and the OKB Task Force."
        />
        <FrameworkCycle />
      </PublicPageSection>

      {/* 07 Performance */}
      <PublicPageSection id="performance" containerClassName="space-y-8 sm:space-y-10">
        <ChapterHeading
          id="performance"
          eyebrow="Performance"
          title={
            <>
              Outputs and outcomes, <em>not headcount</em>
            </>
          }
          lead={PERFORMANCE.note}
        />
        <Reveal>
          <div className="okb-fw-perf">
            <article className="okb-fw-perf__card">
              <div className="okb-fw-perf__head">
                <span className="okb-fw-perf__head-icon">
                  <BarChart3 className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/75">What crews deliver</p>
                  <h3 className="text-lg font-bold leading-tight">Output indicators</h3>
                </div>
              </div>
              <ul className="okb-fw-perf__list">
                {PERFORMANCE.outputs.map((item, i) => (
                  <li key={item} className="okb-fw-perf__item">
                    <span className="okb-fw-perf__dot">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
            <div className="okb-fw-perf__link" aria-hidden>
              <span className="okb-fw-perf__link-icon">
                <ArrowDown className="size-5 lg:hidden" />
                <ArrowRight className="hidden size-5 lg:block" />
              </span>
              Leads to
            </div>
            <article className="okb-fw-perf__card okb-fw-perf__card--outcome">
              <div className="okb-fw-perf__head">
                <span className="okb-fw-perf__head-icon">
                  <Sparkles className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-white/80">What communities feel</p>
                  <h3 className="text-lg font-bold leading-tight">Outcome indicators</h3>
                </div>
              </div>
              <ul className="okb-fw-perf__list">
                {PERFORMANCE.outcomes.map((item, i) => (
                  <li key={item} className="okb-fw-perf__item">
                    <span className="okb-fw-perf__dot">{i + 1}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </Reveal>
      </PublicPageSection>

      {/* 08 Maintenance */}
      <PublicPageSection id="maintenance" alternate containerClassName="space-y-8 sm:space-y-10">
        <ChapterHeading
          id="maintenance"
          eyebrow="Preventive and periodic maintenance"
          title={
            <>
              Five rhythms <em>of upkeep</em>
            </>
          }
          lead="From the calendar to the emergency call — maintenance never stops at one clearing."
        />
        <ol className="okb-fw-rhythm">
          {MAINTENANCE_TYPES.map((item, index) => {
            const ui = RHYTHM_UI[item.id];
            const Icon = ui.icon;
            return (
              <Reveal as="li" key={item.id} delay={index * 0.05} className="okb-fw-rhythm__item">
                <span className="okb-fw-rhythm__node">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="okb-fw-rhythm__card">
                  <p className="okb-fw-rhythm__when">{ui.when}</p>
                  <h3 className="okb-public-heading mt-1 text-base sm:text-lg">{item.title}</h3>
                  <p className="okb-public-body mt-1 text-sm leading-relaxed">{item.body}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </PublicPageSection>

      {/* 09 Partners */}
      <PublicPageSection id="partners" containerClassName="space-y-8 sm:space-y-10">
        <ChapterHeading
          id="partners"
          eyebrow="Whole-of-nation"
          title={
            <>
              Partners around <em>the same waterway</em>
            </>
          }
          lead="Each partner keeps its own mandate — together they keep one river system flowing."
        />
        <Reveal>
          <div className="okb-fw-partners">
            <div className="okb-fw-partners__hub">
              <Waves className="okb-fw-partners__waves size-9" aria-hidden />
              <p className="font-[family-name:var(--font-okb-display)] text-xl font-bold uppercase leading-none">
                One waterway
              </p>
              <p className="text-xs text-white/75">Ridge to reef</p>
            </div>
            {PARTNERS.map((partner) => {
              const Icon = PARTNER_ICONS[partner.id];
              return (
                <article key={partner.id} className="okb-fw-partner">
                  <span className="okb-fw-partner__icon">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 className="okb-public-heading text-lg leading-tight">{partner.title}</h3>
                    <p className="okb-public-body mt-1 text-sm leading-relaxed">{partner.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </Reveal>
      </PublicPageSection>

      {/* 10 Sign-off */}
      <PublicPageSection id="signoff" alternate containerClassName="space-y-8">
        <ChapterHeading
          id="signoff"
          eyebrow="Living framework"
          title={
            <>
              Data, review, and <em>strict implementation</em>
            </>
          }
          lead="An OKB information and data-management system supports planning, resource allocation, and monitoring of recurring hotspots, and the Task Force periodically evaluates implementation."
        />

        <div className="okb-fw-pillars">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.05}>
              <div className="okb-fw-pillar h-full">
                <span className="okb-fw-pillar__icon">
                  <p.icon className="size-5" aria-hidden />
                </span>
                <span>
                  {p.title}
                  <small>{p.body}</small>
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.08}>
          <div
            id="framework-signoff"
            className="okb-fw-signoff relative isolate overflow-hidden rounded-xl p-6 sm:p-8"
          >
            <div
              aria-hidden
              className="okb-fw-signoff-wash pointer-events-none absolute inset-0"
              style={{ backgroundImage: `url(${SECRETARY_PORTRAIT.src})` }}
            />
            <div
              aria-hidden
              className="okb-fw-signoff-veil pointer-events-none absolute inset-0"
            />

            <div className="okb-fw-signoff-grid relative z-10">
              <p className="okb-fw-signoff-kicker">
                For information and strict implementation
              </p>
              <div className="okb-fw-signoff-identity">
                <p className="okb-fw-signoff-name">
                  {FRAMEWORK_META.signedBy}
                </p>
                <p className="okb-fw-signoff-title mt-1">
                  {FRAMEWORK_META.signedTitle}
                </p>
              </div>
              <figure className="okb-fw-signoff-portrait">
                <img
                  src={SECRETARY_PORTRAIT.src}
                  alt={SECRETARY_PORTRAIT.alt}
                  width={2048}
                  height={1536}
                />
              </figure>
              <p className="okb-fw-signoff-meta">
                {FRAMEWORK_META.dateIssued} · {FRAMEWORK_META.tracking}
              </p>
              <div className="okb-fw-signoff-cta flex flex-wrap gap-2">
                <a
                  href={FRAMEWORK_DOCUMENT_HREF}
                  download
                  className="okb-public-btn okb-public-btn-accent"
                >
                  <ArrowDownToLine className="size-4" aria-hidden />
                  Download the signed memorandum
                </a>
                <Link href={PUBLIC_ROUTES.commandCenter} className="okb-fw-btn okb-fw-btn--ghost">
                  <span>See it in the Command Center</span>
                  <ArrowUpRight className="okb-fw-btn__icon size-4 shrink-0" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </PublicPageSection>
    </MotionConfig>
  );
}
