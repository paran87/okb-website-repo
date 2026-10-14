import { HomeHero } from "@/components/public";
import { BrieferChallenges, BrieferLaunchings, BrieferParadigm, BrieferWhatIs } from "@/components/public/briefer-sections";
import { HomeCommandBand, HomeCoverage, HomeExplore, HomeMission } from "@/components/public/home-sections";

/** Public home: the program in brief, why it exists, the website tabs, where the program works, the Command Center. */
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeMission />
      <BrieferWhatIs alt />
      <BrieferParadigm alt={false} />
      <BrieferChallenges alt />
      <BrieferLaunchings alt={false} />
      <HomeExplore />
      <HomeCoverage />
      <HomeCommandBand />
    </>
  );
}
