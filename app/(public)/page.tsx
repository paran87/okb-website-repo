import { HomeHero } from "@/components/public";
import { BrieferChallenges, BrieferLaunchings, BrieferParadigm, BrieferWhatIs } from "@/components/public/briefer-sections";
import { HomeCommandBand, HomeCoverage, HomeExplore, HomeMission } from "@/components/public/home-sections";
import { getCoverage } from "@/features/accomplishment/server/coverage";

/** Where the program works comes live from the OKB SSOT sheet (read at most every 10 minutes). */
export const revalidate = 600;

/** Public home: the program in brief, why it exists, the website tabs, where the program works, the Command Center. */
export default async function HomePage() {
  const coverage = await getCoverage();
  return (
    <>
      <HomeHero coverage={coverage} />
      <HomeMission />
      <BrieferWhatIs alt />
      <BrieferParadigm alt={false} />
      <BrieferChallenges alt />
      <BrieferLaunchings alt={false} />
      <HomeExplore />
      <HomeCoverage coverage={coverage} />
      <HomeCommandBand />
    </>
  );
}
