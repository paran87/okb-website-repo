import { BarChart3, MapPin, Table2, TrendingUp } from "lucide-react";
import { PublicPageHero } from "@/components/public";
import { AccomplishmentDashboard } from "@/components/public/accomplishment-dashboard";
import { AccomplishmentHeroArt } from "@/components/public/accomplishment-hero-art";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "Accomplishment",
  description: `Live ${APP.program} accomplishments dashboard — waste collection, regional progress, and source tables.`,
};

const HERO_BANNER = {
  src: "/accomplishment/accomplishment-hero-progress.webp",
  alt: "A dredged and newly walled river channel running through a lowland city at blue hour, with equipment barges moored along the completed embankment.",
} as const;

const HERO_CHIPS = [
  { icon: TrendingUp, label: "Overall progress" },
  { icon: BarChart3, label: "Accomplishment types" },
  { icon: MapPin, label: "Regions and areas" },
  { icon: Table2, label: "Source tables" },
] as const;

export default function AccomplishmentPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Program results"
        title="Accomplishment"
        description={`Live ${APP.program} accomplishments monitoring — overall progress, accomplishment types, regions and areas, and source tables.`}
        bannerImage={HERO_BANNER}
        art={<AccomplishmentHeroArt />}
      >
        <ul className="okb-acc-chips">
          {HERO_CHIPS.map(({ icon: Icon, label }) => (
            <li key={label} className="okb-acc-chip">
              <Icon className="size-4 shrink-0" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </PublicPageHero>

      <section className="okb-public-section border-t py-6 sm:py-8">
        <div className="okb-public-shell max-w-[90rem]">
          <AccomplishmentDashboard />
        </div>
      </section>
    </>
  );
}
