import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRiverBasin, MAJOR_RIVER_BASINS } from "@/lib/config/river-basins";
import { getBasinStudies } from "@/lib/river-basin/documents";
import { getAdjacentBasins, getBasinSummary } from "@/lib/river-basin/summary";
import { BasinStudy } from "@/features/river-basin/components/basin-study";

export function generateStaticParams() {
  return MAJOR_RIVER_BASINS.map((basin) => ({ slug: basin.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const basin = getRiverBasin(slug);
  return {
    title: basin ? `${basin.label} River Basin` : "River Basin",
    description: basin
      ? `Feasibility study and master plan for the ${basin.label} river basin.`
      : undefined,
  };
}

export default async function RiverBasinDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const basin = getRiverBasin(slug);
  const studies = getBasinStudies(slug);
  const summary = getBasinSummary(slug);
  if (!basin || !studies || !summary) notFound();
  const { prev, next } = getAdjacentBasins(slug);

  return (
    <BasinStudy
      basin={basin}
      summary={summary}
      prev={prev}
      next={next}
      studies={studies}
    />
  );
}
