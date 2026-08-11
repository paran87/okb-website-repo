import Link from "next/link";

import { OkbLogo } from "@/components/brand/okb-logo";

import { APP, PUBLIC_ROUTES } from "@/lib/constants";



const exploreLinks = [

  { href: PUBLIC_ROUTES.about, label: "About the Program" },

  { href: PUBLIC_ROUTES.initiatives, label: "Initiatives" },

  { href: PUBLIC_ROUTES.activity, label: "Activity" },

  { href: PUBLIC_ROUTES.advisories, label: "Advisories" },

  { href: PUBLIC_ROUTES.profile, label: "Profile" },

  { href: PUBLIC_ROUTES.contact, label: "Contact" },

] as const;



export function SiteFooter() {

  const year = new Date().getFullYear();



  return (

    <footer className="okb-public-footer">

      <div className="okb-public-shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr] lg:py-14">

        <div>

          <div className="flex items-start gap-4">

            <OkbLogo size={56} className="shrink-0" />

            <div>

              <p className="text-xl font-bold text-white sm:text-2xl">

                {APP.program}

              </p>

            </div>

          </div>

          <p className="okb-public-prose mt-4 text-sm leading-relaxed text-[#a8b4c4]">

            The national flood-control program of the {APP.organization},

            coordinating infrastructure, monitoring, and emergency response

            across the country.

          </p>

        </div>



        <div>

          <p className="text-sm font-bold text-white">Explore</p>

          <ul className="mt-3 space-y-2 text-sm">

            {exploreLinks.map((item) => (

              <li key={item.href}>

                <Link href={item.href} className="hover:text-white">

                  {item.label}

                </Link>

              </li>

            ))}

          </ul>

        </div>



        <div>

          <p className="text-sm font-bold text-white">Operations</p>

          <ul className="mt-3 space-y-2 text-sm">

            <li>

              <Link

                href={PUBLIC_ROUTES.commandCenter}

                target="_blank"

                rel="noopener noreferrer"

                className="okb-public-footer-link-accent hover:text-white"

              >

                OKB Command Center

              </Link>

            </li>

            <li>

              <a

                href="https://www.dpwh.gov.ph"

                target="_blank"

                rel="noopener noreferrer"

                className="hover:text-white"

              >

                DPWH Official Website

              </a>

            </li>

          </ul>

        </div>

      </div>



      <div className="border-t border-white/10">

        <div className="okb-public-shell flex flex-col gap-2 py-5 text-xs text-[#8a96a8] sm:flex-row sm:items-center sm:justify-between">

          <p>© {year} {APP.organization}. All rights reserved.</p>

          <p>Flood control · Public works · National resilience</p>

        </div>

      </div>

    </footer>

  );

}


