import { PublicPageHero, PublicPageSection } from "@/components/public";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "About",
  description: `Learn about ${APP.program}, the DPWH national flood-control program.`,
};

export default function AboutPage() {
  return (
    <>
      <PublicPageHero
        eyebrow={APP.organizationShort}
        title={`About ${APP.program}`}
        description="A whole-of-government flood-control effort led by the Department of Public Works and Highways to reduce flood risk, protect critical infrastructure, and support communities before, during, and after severe weather."
      />

      <PublicPageSection containerClassName="space-y-12">
        <div>
          <h2 className="okb-public-heading text-2xl sm:text-3xl">Mission</h2>
          <p className="okb-public-body okb-public-prose mt-4 text-base sm:text-lg">
            Deliver resilient flood-control infrastructure and coordinated
            operations so Filipino communities remain safe and connected when
            rainfall intensifies and rivers swell.
          </p>
        </div>

        <div className="okb-public-divider grid gap-8 border-t pt-12 md:grid-cols-2">
          <div className="okb-public-card rounded-sm p-6">
            <h3 className="okb-public-heading text-xl">
              What the program covers
            </h3>
            <ul className="okb-public-body mt-4 list-disc space-y-2 pl-5">
              <li>Planning and construction of flood-control projects</li>
              <li>Maintenance of waterways, drainage, and pump facilities</li>
              <li>Monitoring of flood-prone and critical areas</li>
              <li>Coordination with LGUs and partner agencies</li>
              <li>Public advisories during weather emergencies</li>
            </ul>
          </div>
          <div className="okb-public-card rounded-sm p-6">
            <h3 className="okb-public-heading text-xl">
              How Command Center fits in
            </h3>
            <p className="okb-public-body mt-4">
              The OKB Command Center is the operational nerve center of{" "}
              {APP.program}. It gives authorized DPWH teams a shared map of
              flood conditions, incidents, road status, equipment, and weather
              so response decisions stay fast and consistent nationwide.
            </p>
          </div>
        </div>
      </PublicPageSection>
    </>
  );
}
