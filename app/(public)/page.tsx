import { HomeHero } from "@/components/public";
import { HomeCommandBand, HomeCycle, HomeExplore, HomeMission } from "@/components/public/home-sections";

/** Public home: the program in brief, why it exists, the website tabs, the operational cycle, the Command Center. */
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeMission />
      <HomeExplore />
      <HomeCycle />
      <HomeCommandBand />
    </>
  );
}
