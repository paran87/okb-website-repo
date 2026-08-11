"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { OkbLogo } from "@/components/brand/okb-logo";
import { SiteHeaderAccent } from "@/components/public/site-header-accent";
import { PUBLIC_NAV_ITEMS } from "@/lib/config/public-navigation";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";
import { cn } from "@/utils/cn";

const BAGONG_PILIPINAS_LOGO = "/brand/bagong-pilipinas-logo.png";
const DPWH_LOGO = "/brand/dpwh-logo.png";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 shadow-sm">
      <div className="okb-public-masthead">
        <SiteHeaderAccent />
        <div className="okb-public-shell okb-public-masthead-inner">
          <Link
            href={PUBLIC_ROUTES.home}
            className="okb-public-masthead-primary flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
            onClick={() => setOpen(false)}
            aria-label={`${APP.program} home`}
          >
            <OkbLogo size={88} priority className="shrink-0" />
            <span className="hidden min-w-0 md:block">
              <span className="okb-public-heading okb-public-masthead-title block">
                {APP.organization}
              </span>
              <span className="okb-public-body okb-public-masthead-subtitle block">
                Office of Undersecretary for Special Concerns · {APP.program}
              </span>
            </span>
          </Link>

          <div className="okb-public-masthead-gov-logos flex shrink-0 items-center gap-3 sm:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={DPWH_LOGO}
              alt="Department of Public Works and Highways"
              className="okb-public-gov-logo okb-public-gov-logo--dpwh hidden shrink-0 sm:block"
              decoding="async"
            />

            <span
              className="okb-public-masthead-divider hidden h-12 w-px shrink-0 bg-white/25 md:block"
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
              className="okb-public-masthead-menu-btn inline-flex size-11 shrink-0 items-center justify-center rounded-sm lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
      </div>

      <nav className="okb-public-nav-bar hidden lg:block" aria-label="Primary">
        <div className="okb-public-shell flex flex-wrap items-center gap-1 py-1">
          {PUBLIC_NAV_ITEMS.map((item) => {
            const active =
              item.href === PUBLIC_ROUTES.home
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const newTabProps = item.openInNewTab
              ? { target: "_blank" as const, rel: "noopener noreferrer" }
              : {};

            if (item.emphasis) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  {...newTabProps}
                  className={cn(
                    "okb-public-nav-cta text-xs sm:text-sm",
                    active &&
                      "ring-2 ring-white/60 ring-offset-2 ring-offset-[var(--dpwh-blue)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                {...newTabProps}
                className={cn(
                  "okb-public-nav-link text-xs sm:text-sm",
                  active && "okb-public-nav-link-active",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {open ? (
        <div
          id="mobile-nav"
          className="okb-public-nav-bar border-t border-[var(--dpwh-blue-dark)] lg:hidden"
        >
          <nav className="okb-public-shell flex flex-col gap-1 py-3" aria-label="Mobile">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const active =
                item.href === PUBLIC_ROUTES.home
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  {...(item.openInNewTab
                    ? { target: "_blank" as const, rel: "noopener noreferrer" }
                    : {})}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-sm px-3 py-2.5 text-sm font-semibold",
                    item.emphasis
                      ? "okb-public-nav-cta ml-0 w-fit"
                      : cn(
                          "okb-public-nav-link",
                          active && "okb-public-nav-link-active",
                        ),
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
