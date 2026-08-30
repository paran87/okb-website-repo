import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

function titleFromSlug(slug: readonly string[]): string {
  return slug
    .map((segment) =>
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(" / ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: titleFromSlug(slug) };
}

/** Fallback for unknown /command/* routes — shows a coming-soon placeholder. */
export default async function CommandCatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;

  return (
    <ModulePage
      title={titleFromSlug(slug)}
      description="This module is not available yet."
      icon={Compass}
    />
  );
}
