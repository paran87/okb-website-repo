"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, BarChart3, FileText, Images, Radio, Shield, Siren, Waves, type LucideIcon } from "lucide-react";
import { OPERATIONAL_CYCLE } from "@/lib/config/okb-framework";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: reduce ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="okb-home-kicker">{kicker}</p>
      <h2 className="okb-home-h2">{title}</h2>
      {children ? <p className="okb-home-body mt-2">{children}</p> : null}
    </div>
  );
}

const PILLARS: { icon: LucideIcon; title: string; body: string; tone: string }[] = [
  {
    icon: Waves,
    title: "Flood-control works",
    body: "Desilting, dredging and declogging restore waterways and drainage; pumping stations kept running.",
    tone: "blue",
  },
  {
    icon: Shield,
    title: "Prepared communities",
    body: "Coordination with LGUs, DENR and MMDA, and assets staged where flood risk is highest.",
    tone: "orange",
  },
  {
    icon: Siren,
    title: "Live operations",
    body: "The OKB Command Center joins field reports, flood monitoring and weather in one picture.",
    tone: "gold",
  },
];

/** Ridge-to-reef flood-control scene: watershed, dredged river, drained city with a pumping station, clear outfall. */
function FloodControlIllustration() {
  return (
    <svg viewBox="0 0 480 300" className="okb-home-illus" role="img" aria-labelledby="okb-home-illus-title">
      <title id="okb-home-illus-title">
        Ridge to reef: forested uplands, a dredged river, a city with drainage and a pumping station, and a clear coastal outfall
      </title>
      <defs>
        <linearGradient id="okb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b47bd" />
          <stop offset="1" stopColor="#5ea0ff" />
        </linearGradient>
        <linearGradient id="okb-water" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="okb-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0369a1" />
          <stop offset="1" stopColor="#002855" />
        </linearGradient>
      </defs>
      <rect width="480" height="300" rx="14" fill="url(#okb-sky)" />
      <circle cx="402" cy="58" r="26" fill="#fcd116" opacity="0.9" />
      <circle cx="402" cy="58" r="40" fill="#fcd116" opacity="0.18" />
      {/* Clouds and rain over the ridge */}
      <g fill="#ffffff" opacity="0.85">
        <ellipse cx="92" cy="46" rx="34" ry="11" />
        <ellipse cx="118" cy="40" rx="22" ry="10" />
        <ellipse cx="262" cy="34" rx="28" ry="9" />
      </g>
      <g stroke="#bae6fd" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <path d="M78 62l-5 12M94 62l-5 12M110 62l-5 12M126 62l-5 12" />
      </g>
      {/* Ridge */}
      <path d="M0 190 L62 92 L104 140 L150 78 L222 170 L0 214Z" fill="#14532d" />
      <path d="M62 92 L76 114 L52 112Z M150 78 L166 100 L138 98Z" fill="#e0f2fe" opacity="0.85" />
      <path d="M0 214 L222 170 L300 196 L300 300 L0 300Z" fill="#166534" />
      {/* City block on the floodplain */}
      <g fill="#1e3a8a">
        <rect x="246" y="138" width="22" height="58" rx="2" />
        <rect x="272" y="120" width="26" height="76" rx="2" />
        <rect x="302" y="146" width="20" height="50" rx="2" />
        <rect x="326" y="130" width="24" height="66" rx="2" />
      </g>
      <g fill="#fde68a" opacity="0.9">
        <rect x="251" y="146" width="4" height="4" /><rect x="259" y="146" width="4" height="4" />
        <rect x="277" y="130" width="4" height="4" /><rect x="285" y="130" width="4" height="4" /><rect x="277" y="142" width="4" height="4" />
        <rect x="306" y="154" width="4" height="4" /><rect x="331" y="140" width="4" height="4" /><rect x="339" y="152" width="4" height="4" />
      </g>
      <path d="M222 196 L480 186 L480 300 L222 300Z" fill="#15803d" />
      {/* River from the ridge to the sea */}
      <path d="M96 150 C120 190 170 196 200 214 S270 246 330 238 S420 226 480 232 L480 262 C420 256 360 266 320 268 S240 262 196 240 S120 210 86 160Z" fill="url(#okb-water)" />
      <path d="M140 200 C170 214 196 222 222 232" stroke="#e0f2fe" strokeWidth="2" strokeDasharray="6 7" fill="none" opacity="0.9" />
      {/* Dredger on the river */}
      <g transform="translate(176 206)">
        <rect x="0" y="10" width="40" height="10" rx="2" fill="#f57e20" />
        <rect x="8" y="2" width="14" height="9" rx="1.5" fill="#fff4eb" />
        <path d="M26 10 L44 -8 L50 -4" stroke="#f57e20" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M48 -6 l6 8 h-8z" fill="#9a3412" />
      </g>
      {/* Pumping station and outfall */}
      <g transform="translate(360 168)">
        <rect x="0" y="6" width="44" height="30" rx="3" fill="#f8fafc" />
        <path d="M-4 8 L22 -8 L48 8Z" fill="#f57e20" />
        <rect x="16" y="18" width="12" height="18" fill="#0038a8" />
        <path d="M44 28 h18 v24" stroke="#64748b" strokeWidth="5" fill="none" />
        <path d="M62 52 q4 10 -4 16" stroke="#38bdf8" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      {/* Coast and reef */}
      <path d="M380 262 C420 252 450 256 480 254 L480 300 L360 300Z" fill="url(#okb-sea)" />
      <g fill="#fb7185" opacity="0.8">
        <circle cx="430" cy="284" r="4" /><circle cx="442" cy="288" r="3" /><circle cx="455" cy="282" r="4" />
      </g>
      {/* Zone labels */}
      <g fontFamily="var(--font-okb-display), ui-sans-serif, system-ui" fontWeight="700" fontSize="11" letterSpacing="1.2" fill="#ffffff">
        <text x="40" y="232">RIDGE</text>
        <text x="150" y="272">RIVER</text>
        <text x="262" y="114">FLOODPLAIN</text>
        <text x="366" y="156">PUMPING</text>
        <text x="410" y="246">REEF</text>
      </g>
    </svg>
  );
}

/** Why the program exists: the mission, three pillars and the ridge-to-reef illustration. */
export function HomeMission() {
  return (
    <section className="okb-home-section">
      <div className="okb-public-shell grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-10">
        <Reveal>
          <SectionHead kicker="Why it exists" title="One national program against flood risk">
            {APP.program} brings DPWH flood-control works, field operations and real-time situational awareness under
            one mission: keep people, roads and communities moving when the waters rise.
          </SectionHead>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {PILLARS.map((p) => {
              const Icon = p.icon;
              return (
                <li key={p.title} className="okb-home-pillar">
                  <span className={`okb-home-pillar__icon okb-home-pillar__icon--${p.tone}`} aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="okb-home-pillar__title">{p.title}</span>
                    <span className="okb-home-pillar__body">{p.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Reveal>
        <Reveal delay={0.1}>
          <FloodControlIllustration />
        </Reveal>
      </div>
    </section>
  );
}

const EXPLORE: { href: string; title: string; body: string; image: string; position: string; icon: LucideIcon; tag: string }[] = [
  {
    href: PUBLIC_ROUTES.framework,
    title: "OKB Framework",
    body: "The memorandum: policy basis, guiding principles and the operational cycle.",
    image: "/framework/framework-hero-ridge-to-reef.png",
    position: "center 40%",
    icon: FileText,
    tag: "Policy",
  },
  {
    href: PUBLIC_ROUTES.accomplishment,
    title: "Accomplishment",
    body: "Live progress, accomplishment types, regions and source tables.",
    image: "/accomplishment/accomplishment-hero-progress.webp",
    position: "center",
    icon: BarChart3,
    tag: "Results",
  },
  {
    href: PUBLIC_ROUTES.profile,
    title: "Portfolio",
    body: "The program presentation: task force, launch areas and field work.",
    image: "/portfolio/slide-01.png",
    position: "center 20%",
    icon: Images,
    tag: "Program",
  },
];

/** The three website tabs as picture cards. */
export function HomeExplore() {
  return (
    <section className="okb-home-section okb-home-section--alt">
      <div className="okb-public-shell">
        <Reveal>
          <SectionHead kicker="Explore" title="See the program at work" />
        </Reveal>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {EXPLORE.map((e, i) => {
            const Icon = e.icon;
            return (
              <Reveal key={e.href} delay={i * 0.06}>
                <Link href={e.href} className="okb-home-card group">
                  <span className="okb-home-card__media">
                    <Image
                      src={e.image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      style={{ objectPosition: e.position }}
                    />
                    <span className="okb-home-card__tag">
                      <Icon className="size-3.5" aria-hidden />
                      {e.tag}
                    </span>
                  </span>
                  <span className="okb-home-card__text">
                    <span className="okb-home-card__title">
                      {e.title}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                    <span className="okb-home-card__body">{e.body}</span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** The eight stages of the operational cycle, in order. */
export function HomeCycle() {
  return (
    <section className="okb-home-section">
      <div className="okb-public-shell">
        <Reveal>
          <SectionHead kicker="How it works" title="The operational cycle">
            Every intervention follows the same eight stages, from identifying the problem to keeping the area maintained.
          </SectionHead>
        </Reveal>
        <ol className="okb-home-cycle mt-4">
          {OPERATIONAL_CYCLE.map((stage, i) => (
            <li key={stage.id} className="okb-home-step">
              <span className="okb-home-step__num">{String(i + 1).padStart(2, "0")}</span>
              <span className="okb-home-step__title">{stage.title}</span>
            </li>
          ))}
        </ol>
        <Link href={`${PUBLIC_ROUTES.framework}`} className="okb-home-link mt-3">
          Read each stage in the framework
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/** Command Center call to action with a live-map illustration. */
export function HomeCommandBand() {
  return (
    <section className="okb-home-command relative isolate overflow-hidden">
      <svg aria-hidden viewBox="0 0 400 260" className="okb-home-command__map pointer-events-none absolute">
        <g fill="none" stroke="rgba(148,197,255,0.22)" strokeWidth="1">
          {[40, 80, 120, 160, 200, 240].map((y) => (
            <path key={`h${y}`} d={`M0 ${y} H400`} />
          ))}
          {[50, 100, 150, 200, 250, 300, 350].map((x) => (
            <path key={`v${x}`} d={`M${x} 0 V260`} />
          ))}
        </g>
        <path d="M30 210 C90 170 120 190 170 150 S260 120 300 80 S360 40 390 30" stroke="#38bdf8" strokeWidth="3" fill="none" opacity="0.7" />
        <path d="M60 60 L140 110 L230 70 L320 150" stroke="#f57e20" strokeWidth="2" strokeDasharray="5 6" fill="none" opacity="0.8" />
        <circle cx="200" cy="130" r="70" fill="none" stroke="rgba(252,209,22,0.35)" />
        <circle cx="200" cy="130" r="44" fill="none" stroke="rgba(252,209,22,0.45)" />
        <circle cx="200" cy="130" r="5" fill="#fcd116" />
        <circle cx="140" cy="110" r="5" fill="#ef4444" />
        <circle cx="230" cy="70" r="5" fill="#f57e20" />
        <circle cx="320" cy="150" r="5" fill="#22c55e" />
        <circle cx="140" cy="110" r="11" fill="none" stroke="#ef4444" opacity="0.6" className="okb-home-ping" />
      </svg>
      <div className="okb-public-shell relative z-10 flex flex-col gap-4 py-7 sm:py-9 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <p className="okb-hero-chip">
            <span className="okb-hero-chip__dot" aria-hidden />
            Live GIS · authorized personnel
          </p>
          <h2 className="okb-home-h2 okb-home-h2--light mt-2">OKB Command Center</h2>
          <p className="okb-home-body okb-home-body--light mt-1.5">
            Live flood monitoring from field reports, incidents, rainfall radar, waterways and pumping stations — one
            operational picture for coordinated response.
          </p>
        </div>
        <Link href={PUBLIC_ROUTES.commandCenter} className="okb-home-btn okb-home-btn--solid shrink-0 self-start lg:self-auto">
          <Radio className="size-4" aria-hidden />
          Enter OKB Command Center
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
