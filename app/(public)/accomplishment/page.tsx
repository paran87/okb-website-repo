import { Camera, Map, MapPin, TrendingUp } from "lucide-react";
import { PublicPageHero } from "@/components/public";
import { AccomplishmentPanels } from "@/components/public/accomplishment-panels";
import { CoverageExplorer } from "@/components/public/coverage-explorer";
import { AccomplishmentHeroArt } from "@/components/public/accomplishment-hero-art";
import { COVERAGE_TOTALS } from "@/lib/config/okb-coverage";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "Accomplishment",
  description: `Live ${APP.program} accomplishments dashboard, the NCR daily accomplishment board, and program coverage.`,
};

const HERO_BANNER = {
  src: "/photos/excavator-loading-truck.webp",
  alt: "An Oplan Kontra Baha excavator loads dredged river silt and gravel into a dump truck beside a riprap embankment.",
} as const;

const HERO_CHIPS = [
  { icon: TrendingUp, label: "Overall progress" },
  { icon: MapPin, label: "Regions and sites" },
  { icon: Map, label: "Map of cleaned waterways" },
  { icon: Camera, label: "Field photos" },
] as const;

const coverageLine = `${COVERAGE_TOTALS.waterways} waterways and ${COVERAGE_TOTALS.drainage} drainage lines in ${COVERAGE_TOTALS.regions} regions`;

export default function AccomplishmentPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Program results"
        title="Accomplishment"
        description={`Live ${APP.program} accomplishments from the OKB Single Source of Truth — progress per region, site and waterway, a map of cleaned stretches, field photos, field updates, and the equipment and crews deployed.`}
        bannerImage={HERO_BANNER}
        art={<AccomplishmentHeroArt />}
        compact
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
          <AccomplishmentPanels />
        </div>
      </section>

      <section id="coverage" className="okb-home-section okb-home-section--alt scroll-mt-28">
        <div className="okb-public-shell max-w-[90rem]">
          <p className="okb-home-kicker">Program coverage</p>
          <h2 className="okb-home-h2">Every waterway and drainage line</h2>
          <p className="okb-home-body mt-1.5">
            {coverageLine}: dredging and desilting of rivers, creeks and esteros, and declogging of drainage along
            national and local roads. Search by name or pick a region.
          </p>
          <div className="mt-4">
            <CoverageExplorer />
          </div>
        </div>
      </section>
    </>
  );
}
