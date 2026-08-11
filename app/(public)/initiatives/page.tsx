import { PublicPageHero, PublicPageSection } from "@/components/public";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "Initiatives",
  description: `Flood-control initiatives under ${APP.program}.`,
};

const initiatives = [
  {
    title: "River improvement & floodways",
    body: "Channel deepening, embankment works, and floodway corridors that move stormwater away from dense communities.",
  },
  {
    title: "Urban drainage & pumping",
    body: "Pumping stations, interceptors, and drainage upgrades for low-lying cities and major thoroughfares.",
  },
  {
    title: "Critical-area readiness",
    body: "Pre-positioned equipment and rapid-response protocols for historically flood-prone corridors.",
  },
  {
    title: "National situational awareness",
    body: "Shared GIS monitoring through the OKB Command Center for weather, incidents, and asset deployment.",
  },
] as const;

export default function InitiativesPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Program pillars"
        title="Initiatives"
        description={`Priority lines of effort that advance ${APP.program} across regions — from built infrastructure to live operations.`}
      />

      <PublicPageSection>
        <ol className="okb-public-divider divide-y border-y">
          {initiatives.map((item, index) => (
            <li
              key={item.title}
              className="grid gap-4 py-8 sm:grid-cols-[3.5rem_1fr] sm:gap-6"
            >
              <span className="okb-public-accent-blue text-2xl font-bold sm:text-3xl">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="okb-public-heading text-xl sm:text-2xl">
                  {item.title}
                </h2>
                <p className="okb-public-body okb-public-prose mt-2">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </PublicPageSection>
    </>
  );
}
