import { PublicPageHero, PublicPageSection } from "@/components/public";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "Advisories",
  description: `Public flood and weather advisories related to ${APP.program}.`,
};

const advisories = [
  {
    date: "Sample · Monsoon season",
    title: "Stay clear of swollen waterways",
    body: "Avoid riverbanks, drainage outfalls, and underpasses during continuous heavy rainfall. Follow LGU evacuation guidance when issued.",
  },
  {
    date: "Sample · Typhoon watch",
    title: "Road and bridge status updates",
    body: "DPWH regional offices publish passability updates for national roads. Check official channels before long-distance travel.",
  },
  {
    date: "Sample · Community readiness",
    title: "Report blocked drains early",
    body: "Debris in canals and storm drains worsens street flooding. Coordinate cleanup with barangay and city engineering offices.",
  },
] as const;

export default function AdvisoriesPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Public information"
        title="Advisories"
        description="Guidance for residents and travelers during flood-risk periods. Operational feeds for authorized staff live in the OKB Command Center."
      />

      <PublicPageSection containerClassName="space-y-6">
        {advisories.map((item) => (
          <article
            key={item.title}
            className="okb-public-card okb-public-card-blue rounded-sm p-5 sm:p-6"
          >
            <p className="okb-public-eyebrow text-[0.65rem]">{item.date}</p>
            <h2 className="okb-public-heading mt-2 text-xl sm:text-2xl">
              {item.title}
            </h2>
            <p className="okb-public-body okb-public-prose mt-2">{item.body}</p>
          </article>
        ))}

        <p className="okb-public-body pt-2 text-sm">
          These are illustrative public messages for the {APP.program} website.
          Replace with official DPWH releases when available.
        </p>
      </PublicPageSection>
    </>
  );
}
