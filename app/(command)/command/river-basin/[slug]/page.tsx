import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRiverBasin, MAJOR_RIVER_BASINS } from "@/lib/config/river-basins";
import { getBasinStudies } from "@/lib/river-basin/documents";
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
  if (!basin || !studies) notFound();

  return <BasinStudy basin={basin} studies={studies} />;
}
