import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import {
  MAJOR_RIVER_BASINS,
  getRiverBasin,
  riverBasinEmbedUrl,
  riverBasinFolderUrl,
} from "@/lib/config/river-basins";

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
      ? `Master plan and feasibility study files for the ${basin.label} river basin.`
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
  if (!basin) notFound();

  const folderUrl = riverBasinFolderUrl(basin.folderId);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2 md:px-5">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            {basin.number}. {basin.label}
          </h1>
          <p className="text-xs text-muted-foreground">
            Master plan and feasibility study files.
          </p>
        </div>
        <a
          href={folderUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Open in Drive
        </a>
      </header>
      <iframe
        src={riverBasinEmbedUrl(basin.folderId)}
        title={`${basin.label} river basin files`}
        className="min-h-0 w-full flex-1 border-0 bg-background"
        loading="eager"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
