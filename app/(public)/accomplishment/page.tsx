import { PublicPageHero } from "@/components/public";
import { AccomplishmentDashboard } from "@/components/public/accomplishment-dashboard";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "Accomplishment",
  description: `Live ${APP.program} accomplishments dashboard — waste collection, regional progress, and source tables.`,
};

export default function AccomplishmentPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Program results"
        title="Accomplishment"
        description={`Live ${APP.program} accomplishments monitoring — overall progress, accomplishment types, regions and areas, and source tables.`}
      />

      <section className="okb-public-section border-t py-6 sm:py-8">
        <div className="okb-public-shell max-w-[90rem]">
          <AccomplishmentDashboard />
        </div>
      </section>
    </>
  );
}
