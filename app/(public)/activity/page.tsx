import { PublicPageHero, PublicPageSection } from "@/components/public";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "Activity",
  description: `Field operations and program activity updates for ${APP.program}.`,
};

const launchedAreas = [
  {
    date: "November 12, 2025",
    title: "Greater Metro Manila",
    location: "Balintawak Creek, Parañaque City",
    detail:
      "Official launch of waterways clearing and cleaning operations across Metro Manila — 142.2 km of rivers, creeks, and esteros and 333.15 km of drainage systems.",
  },
  {
    date: "November 21, 2025",
    title: "Metro Cebu",
    location: "Mahiga Creek, Cebu City / Mandaue City",
    detail:
      "Metro Cebu Waterways Clearing and Cleaning Operations with dredging, waste removal, and rehabilitation of major waterways.",
  },
  {
    date: "December 12, 2025",
    title: "Bacolod City",
    location: "Mambuloc Creek, Barangay 2",
    detail:
      "Launch of Bacolod City waterways clearing covering nine priority waterways and nearly 170 km of rivers, creeks, and drainage systems.",
  },
  {
    date: "February 21, 2026",
    title: "Naga City",
    location: "Sagop Creek, Barangay Triangulo",
    detail:
      "Inspection and rollout of Oplan Kontra Baha clearing operations in Naga City.",
  },
  {
    date: "May 19, 2026",
    title: "Iloilo City",
    location: "Barangay Ticud, La Paz — Jaro River",
    detail:
      "Partnership with Iloilo City Government and DOLE for river rehabilitation, TUPAD cleanup crews, and waste trap installation.",
  },
] as const;

const fieldActivities = [
  "Declogging of drainage canals, culverts, and street-level inlets",
  "Desilting and removal of garbage and debris from rivers and esteros",
  "Dredging operations to deepen and widen waterways",
  "Clearing of illegal structures and obstructions along water channels",
  "Rehabilitation and operation of pumping stations",
  "District engineering office before-during-after clearing works",
] as const;

const softLaunchAreas = [
  "Iligan City",
  "Tuguegarao City",
  "Maguindanao del Sur",
  "Ilocos Sur",
  "Roxas City",
  "Iloilo City",
  "Bukidnon",
  "Pangasinan",
  "Cagayan de Oro City",
  "La Union",
  "Bugallon",
] as const;

export default function ActivityPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Field operations"
        title="Activity"
        description={`Ongoing and completed ${APP.program} operations — program launches, waterway rehabilitation, clearing works, and nationwide soft-launch areas.`}
        bannerImage={{
          src: "/activity/operations-focus-banner.png",
          alt: "Oplan Kontra Baha operations focus — declogging and cleaning of street drainage, dredging and desilting of estero and creek.",
        }}
      />

      <PublicPageSection className="py-10 sm:py-12" containerClassName="space-y-5">
        <div>
          <h2 className="okb-public-heading text-2xl sm:text-3xl">
            NCR Waterways — Cleaning Status
          </h2>
          <p className="okb-public-body okb-public-prose mt-3">
            Interactive map of Metro Manila rivers, creeks, and esteros with
            current clearing and cleaning status across the National Capital
            Region.
          </p>
        </div>

        <div className="okb-public-card overflow-hidden rounded-sm border shadow-sm">
          <iframe
            src="/activity/ncr-waterways.html"
            title="NCR Waterways cleaning status map"
            className="block h-[min(80vh,900px)] w-full border-0 bg-[#0E1A24]"
            loading="lazy"
          />
        </div>
      </PublicPageSection>

      <PublicPageSection containerClassName="space-y-14">
        <div>
          <h2 className="okb-public-heading text-2xl sm:text-3xl">
            Program launches
          </h2>
          <p className="okb-public-body okb-public-prose mt-3">
            Major Oplan Kontra Baha launch events led by DPWH and partner
            agencies across priority flood-prone areas.
          </p>

          <ol className="okb-public-divider mt-8 divide-y border-y">
            {launchedAreas.map((item) => (
              <li
                key={item.title}
                className="grid gap-3 py-8 sm:grid-cols-[9.5rem_1fr] sm:gap-6"
              >
                <p className="okb-public-accent-blue text-sm font-bold">{item.date}</p>
                <div>
                  <h3 className="okb-public-heading text-xl">{item.title}</h3>
                  <p className="mt-1 text-sm font-medium text-[#5a6578]">
                    {item.location}
                  </p>
                  <p className="okb-public-body okb-public-prose mt-2">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="okb-public-divider grid gap-8 border-t pt-12 lg:grid-cols-2">
          <div className="okb-public-card rounded-sm p-6">
            <h2 className="okb-public-heading text-2xl">
              Ongoing field activities
            </h2>
            <ul className="okb-public-body mt-4 space-y-3">
              {fieldActivities.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="okb-public-dot mt-2 size-1.5 shrink-0 rounded-full" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="okb-public-card rounded-sm p-6">
            <h2 className="okb-public-heading text-2xl">
              Soft-launch operations
            </h2>
            <p className="okb-public-body mt-3">
              Eleven additional areas have started Oplan Kontra Baha clearing
              and cleaning operations ahead of full program rollout.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {softLaunchAreas.map((area) => (
                <li
                  key={area}
                  className="rounded-sm border border-[var(--dpwh-border)] bg-[var(--dpwh-panel)] px-3 py-2 text-sm"
                >
                  {area}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PublicPageSection>
    </>
  );
}
