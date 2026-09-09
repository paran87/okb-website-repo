"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  type Variants,
} from "framer-motion";
import {
  Ship,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  FileText,
  Images,
  Menu,
  Radio,
  X,
  type LucideIcon,
} from "lucide-react";
import { OkbLogo } from "@/components/brand/okb-logo";
import { SiteHeaderAccent } from "@/components/public/site-header-accent";
import { PUBLIC_NAV_ITEMS } from "@/lib/config/public-navigation";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";

const BAGONG_PILIPINAS_LOGO = "/brand/bagong-pilipinas-logo.png";
const DPWH_LOGO = "/brand/dpwh-logo.png";

/** Scroll offset (px) after which the masthead condenses. */
const CONDENSE_AT = 28;

const NAV_ICONS: Record<string, LucideIcon> = {
  [PUBLIC_ROUTES.framework]: FileText,
  [PUBLIC_ROUTES.dredgerStatus]: Ship,
  [PUBLIC_ROUTES.accomplishment]: BarChart3,
  [PUBLIC_ROUTES.profile]: Images,
  [PUBLIC_ROUTES.commandCenter]: Radio,
};

const panelVariants: Variants = {
  hidden: { opacity: 0, y: -14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut",
      staggerChildren: 0.055,
      delayChildren: 0.06,
    },
  },
  exit: { opacity: 0, y: -12, transition: { duration: 0.18, ease: "easeIn" } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
  exit: { opacity: 0 },
};

export function SiteHeader() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const [open, setOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);

  const isActive = (href: string) =>
    href === PUBLIC_ROUTES.home
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > CONDENSE_AT);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    // The menu only exists below the lg breakpoint, so only lock there.
    const lock = window.innerWidth < 1024;
    const previousOverflow = document.body.style.overflow;
    if (lock) document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (lock) document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const pillTransition = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.7 };

  return (
    <header
      className={cn(
        "okb-public-header sticky top-0 z-50",
        condensed && "okb-public-header--condensed",
      )}
    >
      <div className="okb-public-masthead">
        <SiteHeaderAccent />
        <div className="okb-public-shell okb-public-masthead-inner">
          <Link
            href={PUBLIC_ROUTES.home}
            className="okb-public-masthead-primary flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
            onClick={() => setOpen(false)}
            aria-label={`${APP.program} home`}
          >
            <span className="okb-masthead-logo-wrap shrink-0">
              <OkbLogo size={92} priority className="okb-masthead-logo" />
            </span>

            <span className="okb-public-masthead-wordmark min-w-0 md:hidden">
              <span className="okb-public-masthead-wordmark-title block">
                {APP.program}
              </span>
              <span className="okb-public-masthead-wordmark-sub block">
                {APP.organizationShort} · Special Concerns
              </span>
            </span>

            <span className="okb-masthead-lockup hidden min-w-0 md:block">
              <span className="okb-mast-eyebrow">Republic of the Philippines</span>
              <span className="okb-public-heading okb-public-masthead-title block">
                {APP.organization}
              </span>
              <span className="okb-public-body okb-public-masthead-subtitle">
                <span>Office of Undersecretary for Special Concerns</span>
                {/* Dot travels with the program name so it never dangles at a wrap. */}
                <span className="okb-mast-subtitle-tail">
                  <span className="okb-mast-dot" aria-hidden />
                  <em>{APP.program}</em>
                </span>
              </span>
            </span>
          </Link>

          <div className="okb-public-masthead-gov-logos flex shrink-0 items-center gap-2.5 sm:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DPWH_LOGO}
              alt="Department of Public Works and Highways"
              className="okb-public-gov-logo okb-public-gov-logo--dpwh shrink-0"
              decoding="async"
            />

            <span
              className="okb-public-masthead-divider hidden shrink-0 md:block"
              aria-hidden
            />

            <a
              href="https://www.gov.ph/bagong-pilipinas"
              target="_blank"
              rel="noopener noreferrer"
              className="okb-public-gov-logo-link hidden shrink-0 md:block"
              aria-label="Bagong Pilipinas — opens in new tab"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BAGONG_PILIPINAS_LOGO}
                alt="Bagong Pilipinas"
                className="okb-public-gov-logo okb-public-gov-logo--bp"
                decoding="async"
              />
            </a>

            <button
              type="button"
              className="okb-public-masthead-menu-btn inline-flex size-11 shrink-0 items-center justify-center lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <AnimatePresence initial={false} mode="wait">
                <motion.span
                  key={open ? "close" : "open"}
                  className="inline-flex"
                  initial={reduce ? false : { opacity: 0, rotate: -90, scale: 0.7 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={reduce ? undefined : { opacity: 0, rotate: 90, scale: 0.7 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {open ? <X className="size-6" /> : <Menu className="size-6" />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </div>

      <nav className="okb-public-nav-bar hidden lg:block" aria-label="Primary">
        <div className="okb-public-shell okb-public-nav-row">
          {PUBLIC_NAV_ITEMS.filter((item) => !item.emphasis).map((item) => {
            const Icon = NAV_ICONS[item.href] ?? FileText;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                {...(item.openInNewTab
                  ? { target: "_blank" as const, rel: "noopener noreferrer" }
                  : {})}
                aria-current={active ? "page" : undefined}
                className={cn("okb-tab", active && "okb-tab--on")}
              >
                {active ? (
                  <motion.span
                    layoutId="okb-tab-pill"
                    className="okb-tab__pill"
                    transition={pillTransition}
                    aria-hidden
                  />
                ) : null}
                <Icon className="okb-tab__icon size-4 shrink-0" aria-hidden />
                <span className="okb-tab__text">{item.label}</span>
              </Link>
            );
          })}

          <span className="okb-nav-rule" aria-hidden />

          {PUBLIC_NAV_ITEMS.filter((item) => item.emphasis).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              {...(item.openInNewTab
                ? { target: "_blank" as const, rel: "noopener noreferrer" }
                : {})}
              className="okb-nav-cta"
            >
              <span className="okb-nav-cta__dot" aria-hidden />
              <span className="okb-nav-cta__text">{item.label}</span>
              <ArrowUpRight className="okb-nav-cta__arrow size-4 shrink-0" aria-hidden />
              <span className="okb-nav-cta__shine" aria-hidden />
            </Link>
          ))}
        </div>
      </nav>

      <motion.span
        className="okb-public-header-progress"
        style={{ scaleX: scrollYProgress }}
        aria-hidden
      />

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="scrim"
              className="okb-mobilenav-scrim lg:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              aria-hidden
            />

            <motion.div
              key="panel"
              id="mobile-nav"
              className="okb-mobilenav lg:hidden"
              variants={panelVariants}
              initial={reduce ? false : "hidden"}
              animate="show"
              exit="exit"
            >
              <div className="okb-mobilenav-art" aria-hidden>
                <span className="okb-mobilenav-aurora" />
                <svg viewBox="0 0 400 320" preserveAspectRatio="none">
                  <g
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                  >
                    <path
                      className={reduce ? undefined : "okb-mobilenav-wave"}
                      d="M-20 54 C70 20 150 84 232 46 C300 15 356 62 420 32"
                    />
                    <path
                      className={reduce ? undefined : "okb-mobilenav-wave"}
                      d="M-20 138 C64 104 158 168 240 128 C312 94 360 142 420 112"
                    />
                    <path
                      className={reduce ? undefined : "okb-mobilenav-wave"}
                      d="M-20 232 C72 198 152 262 238 220 C310 186 362 232 420 204"
                    />
                  </g>
                </svg>
              </div>

              <nav
                className="okb-public-shell okb-mobilenav-inner"
                aria-label="Mobile"
              >
                <p className="okb-mobilenav-kicker">Navigate the program</p>

                {PUBLIC_NAV_ITEMS.filter((item) => !item.emphasis).map((item) => {
                  const Icon = NAV_ICONS[item.href] ?? FileText;
                  const active = isActive(item.href);

                  return (
                    <motion.div key={item.href} variants={itemVariants}>
                      <Link
                        href={item.href}
                        {...(item.openInNewTab
                          ? { target: "_blank" as const, rel: "noopener noreferrer" }
                          : {})}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "okb-mobilenav-item",
                          active && "okb-mobilenav-item--on",
                        )}
                      >
                        <span className="okb-mobilenav-icon" aria-hidden>
                          <Icon className="size-[1.15rem]" />
                        </span>
                        <span className="min-w-0">
                          <span className="okb-mobilenav-label">{item.label}</span>
                          {item.description ? (
                            <span className="okb-mobilenav-desc">
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                        <ChevronRight
                          className="okb-mobilenav-chev size-4 shrink-0"
                          aria-hidden
                        />
                      </Link>
                    </motion.div>
                  );
                })}

                {PUBLIC_NAV_ITEMS.filter((item) => item.emphasis).map((item) => (
                  <motion.div key={item.href} variants={itemVariants}>
                    <Link
                      href={item.href}
                      {...(item.openInNewTab
                        ? { target: "_blank" as const, rel: "noopener noreferrer" }
                        : {})}
                      onClick={() => setOpen(false)}
                      className="okb-mobilenav-cta"
                    >
                      <Radio className="size-[1.15rem] shrink-0" aria-hidden />
                      <span>{item.label}</span>
                      <ArrowUpRight className="size-4 shrink-0" aria-hidden />
                    </Link>
                  </motion.div>
                ))}

                <motion.div className="okb-mobilenav-foot" variants={itemVariants}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={DPWH_LOGO}
                    alt="Department of Public Works and Highways"
                    decoding="async"
                  />
                  <a
                    href="https://www.gov.ph/bagong-pilipinas"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Bagong Pilipinas — opens in new tab"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={BAGONG_PILIPINAS_LOGO}
                      alt="Bagong Pilipinas"
                      decoding="async"
                    />
                  </a>
                  <p>
                    Republic of the Philippines
                    <br />
                    {APP.organization}
                  </p>
                </motion.div>
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
