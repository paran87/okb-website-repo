import Link from "next/link";
import { PublicPageHero, PublicPageSection } from "@/components/public";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Contact",
  description: `Contact information for ${APP.program} and DPWH regional coordination.`,
};

export default function ContactPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Get in touch"
        title="Contact"
        description={`Reach DPWH channels related to ${APP.program}. For live flood operations, authorized personnel should use the OKB Command Center.`}
      />

      <PublicPageSection>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="okb-public-card rounded-sm p-6 sm:p-8">
            <h2 className="okb-public-heading text-2xl">
              Department of Public Works and Highways
            </h2>
            <dl className="okb-public-body mt-6 space-y-5">
              <div>
                <dt className="okb-public-label">
                  Central Office
                </dt>
                <dd className="mt-1 text-[#1a1a1a]">
                  Bonifacio Drive, Port Area, Manila, Philippines
                </dd>
              </div>
              <div>
                <dt className="okb-public-label">
                  Official website
                </dt>
                <dd className="mt-1">
                  <a
                    href="https://www.dpwh.gov.ph"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="okb-public-link"
                  >
                    www.dpwh.gov.ph
                  </a>
                </dd>
              </div>
              <div>
                <dt className="okb-public-label">
                  Program
                </dt>
                <dd className="mt-1 text-[#1a1a1a]">{APP.program}</dd>
              </div>
              <div>
                <dt className="okb-public-label">
                  Email
                </dt>
                <dd className="mt-1">
                  <a href="mailto:okb@dpwh.gov.ph" className="okb-public-link">
                    okb@dpwh.gov.ph
                  </a>
                </dd>
              </div>
              <div>
                <dt className="okb-public-label">
                  Hotline
                </dt>
                <dd className="mt-1 text-[#1a1a1a]">(02) 165-02</dd>
              </div>
            </dl>
          </div>

          <div className="okb-public-card flex flex-col rounded-sm p-6 sm:p-8">
            <h2 className="okb-public-heading text-2xl">
              Need the operations desk?
            </h2>
            <p className="okb-public-body mt-3">
              Flood monitoring, incident tracking, and equipment coordination
              happen inside the OKB Command Center.
            </p>
            <Link
              href={PUBLIC_ROUTES.commandCenter}
              target="_blank"
              rel="noopener noreferrer"
              className="okb-public-btn okb-public-btn-primary mt-6 self-start"
            >
              Go to OKB Command Center
            </Link>
          </div>
        </div>
      </PublicPageSection>
    </>
  );
}
