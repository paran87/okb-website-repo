import { MapPin, Ship, Table2, TrendingUp } from "lucide-react";
import { DredgerDashboard, PublicPageHero } from "@/components/public";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "Dredger Status",
  description: `Live ${APP.program} dredger deployment and operational status monitoring.`,
};

const HERO_CHIPS = [
  { icon: Ship, label: "Dredger fleet" },
  { icon: TrendingUp, label: "Deployment status" },
  { icon: MapPin, label: "Operating areas" },
  { icon: Table2, label: "Source tables" },
] as const;

export default function DredgerStatusPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Live monitoring"
        title="Dredger Status"
        description={`Live ${APP.program} dredger deployment and operational status — fleet availability, assigned areas, and source records.`}
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
          <DredgerDashboard />
        </div>
      </section>
    </>
  );
}
