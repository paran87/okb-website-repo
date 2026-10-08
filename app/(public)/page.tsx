import { HomeHero } from "@/components/public";
import { HomeCommandBand, HomeCoverage, HomeExplore, HomeMission } from "@/components/public/home-sections";

/** Public home: the program in brief, why it exists, the website tabs, where the program works, the Command Center. */
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeMission />
      <HomeExplore />
      <HomeCoverage />
      <HomeCommandBand />
    </>
  );
}
