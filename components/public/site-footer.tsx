import Link from "next/link";
import {
  Ship,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  FileText,
  Images,
  Info,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Radio,
  type LucideIcon,
} from "lucide-react";

import { OkbLogo } from "@/components/brand/okb-logo";
import { SiteFooterAccent } from "@/components/public/site-footer-accent";
import {
  FRAMEWORK_META,
  OPERATIONAL_CYCLE,
  RIDGE_TO_REEF_ZONES,
} from "@/lib/config/okb-framework";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";

const DPWH_SITE = "https://www.dpwh.gov.ph";
const PROGRAM_EMAIL = "okb@dpwh.gov.ph";
const PROGRAM_HOTLINE = "(02) 165-02";
const PROGRAM_ADDRESS = "Bonifacio Drive, Port Area, Manila";

/** Official launch cities listed on the program portfolio. */
const LAUNCH_CITIES = 5;
/** Soft-launch areas listed on the program portfolio. */
const SOFT_LAUNCH_AREAS = 11;

const EXPLORE_LINKS: readonly {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: PUBLIC_ROUTES.about, label: "About", icon: Info },
  { href: PUBLIC_ROUTES.framework, label: "OKB Framework", icon: FileText },
  {
    href: PUBLIC_ROUTES.dredgerStatus,
    label: "Dredger Status",
    icon: Ship,
  },
  {
    href: PUBLIC_ROUTES.accomplishment,
    label: "Accomplishment",
    icon: BarChart3,
  },
  { href: PUBLIC_ROUTES.profile, label: "Portfolio", icon: Images },
  { href: PUBLIC_ROUTES.initiatives, label: "Initiatives", icon: BookOpen },
  { href: PUBLIC_ROUTES.advisories, label: "Advisories", icon: Megaphone },
  { href: PUBLIC_ROUTES.contact, label: "Contact", icon: Mail },
];

const FOOTER_FACTS = [
  {
    value: String(LAUNCH_CITIES),
    label: "Official launch cities",
    href: PUBLIC_ROUTES.profile,
  },
  {
    value: String(SOFT_LAUNCH_AREAS),
    label: "Soft-launch areas",
    href: PUBLIC_ROUTES.profile,
  },
  {
    value: String(RIDGE_TO_REEF_ZONES.length),
    label: "Ridge-to-reef zones",
    href: PUBLIC_ROUTES.framework,
  },
  {
    value: String(OPERATIONAL_CYCLE.length),
    label: "Operational cycle stages",
    href: PUBLIC_ROUTES.framework,
  },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="okb-public-footer">
      <SiteFooterAccent />
      <span className="okb-foot-watermark" aria-hidden>
        {APP.shortName}
      </span>
      <span className="okb-foot-glow" aria-hidden />

      <div className="okb-public-shell okb-foot-inner">
        <div className="okb-foot-grid">
          <div className="okb-foot-brand">
            <p className="okb-foot-eyebrow">
              <span className="okb-foot-eyebrow__dot" aria-hidden />
              Republic of the Philippines
            </p>

            <div className="okb-foot-lockup">
              <OkbLogo size={64} className="okb-foot-logo" />
              <div className="okb-foot-brand-copy">
                <p className="okb-foot-title">{APP.program}</p>
                <p className="okb-foot-kicker">
                  Office of the Secretary · {APP.organizationShort}
                </p>
              </div>
            </div>

            <p className="okb-foot-lead">
              The national flood-control program of the {APP.organization},
              coordinating infrastructure, monitoring, and emergency response
              from ridge to reef.
            </p>

            <ul className="okb-foot-mandates">
              <li title={FRAMEWORK_META.directive}>PBBM-2025-1777–1780</li>
              <li title={FRAMEWORK_META.specialOrder}>
                {FRAMEWORK_META.specialOrder}
              </li>
            </ul>
          </div>

          <nav className="okb-foot-col" aria-label="Explore">
            <p className="okb-foot-col__label">Explore</p>
            <ul className="okb-foot-links">
              {EXPLORE_LINKS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} className="okb-foot-link">
                      <Icon className="okb-foot-link__icon" aria-hidden />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="okb-foot-col">
            <p className="okb-foot-col__label">Operations</p>

            <ul className="okb-foot-contact">
              <li>
                <MapPin className="okb-foot-contact__icon" aria-hidden />
                <span>{PROGRAM_ADDRESS}</span>
              </li>
              <li>
                <Mail className="okb-foot-contact__icon" aria-hidden />
                <a href={`mailto:${PROGRAM_EMAIL}`}>{PROGRAM_EMAIL}</a>
              </li>
              <li>
                <Phone className="okb-foot-contact__icon" aria-hidden />
                <a href="tel:16502">{PROGRAM_HOTLINE}</a>
              </li>
            </ul>

            <Link
              href={PUBLIC_ROUTES.commandCenter}
              target="_blank"
              rel="noopener noreferrer"
              className="okb-foot-cta"
            >
              <span className="okb-foot-cta__dot" aria-hidden />
              <span className="okb-foot-cta__text">
                <Radio className="okb-foot-cta__radio" aria-hidden />
                OKB Command Center
              </span>
              <ArrowUpRight className="okb-foot-cta__arrow" aria-hidden />
              <span className="okb-foot-cta__shine" aria-hidden />
            </Link>

            <a
              href={DPWH_SITE}
              target="_blank"
              rel="noopener noreferrer"
              className="okb-foot-ext"
            >
              DPWH Official Website
              <ArrowUpRight aria-hidden />
            </a>
          </div>
        </div>

        <ul className="okb-foot-facts">
          {FOOTER_FACTS.map((fact) => (
            <li key={fact.label}>
              <Link href={fact.href} className="okb-foot-fact">
                <span className="okb-foot-fact__value">{fact.value}</span>
                <span className="okb-foot-fact__label">{fact.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="okb-foot-bar">
        <div className="okb-public-shell okb-foot-bar__inner">
          <p>
            © {year} {APP.organization}. All rights reserved.
          </p>
          <p>Flood control · Public works · National resilience</p>
        </div>
      </div>
    </footer>
  );
}
