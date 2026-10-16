import { PublicPageHero, PublicPageSection } from "@/components/public";
import { NcrDailyAccomplishment } from "@/components/public/accomplishment-panels";

export const metadata = {
  title: "NCR Daily Accomplishment",
  description: "Daily accomplishment boards of the Oplan Kontra Baha operations in the National Capital Region, latest first.",
};

export default function NcrDailyAccomplishmentPage() {
  return (
    <>
      <PublicPageHero
        eyebrow="Program results"
        title="NCR Daily Accomplishment"
        description="The daily accomplishment boards of Oplan Kontra Baha in the National Capital Region, from the latest to the oldest. Open a board to enlarge it."
        compact
      />
      <PublicPageSection className="py-6 sm:py-8">
        <NcrDailyAccomplishment />
      </PublicPageSection>
    </>
  );
}
