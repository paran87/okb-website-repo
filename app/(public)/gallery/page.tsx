import { PublicPageHero, PublicPageSection } from "@/components/public";
import { GalleryGrid } from "@/components/public/gallery/gallery-grid";
import { listGalleryWithStatus } from "@/features/admin/server/media";
import { APP } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gallery",
  description: `Photos and videos from ${APP.program} flood-control operations.`,
};

/** Photos and videos the admin publishes (Admin → Media → Website · Gallery). */
export default async function GalleryPage() {
  const { items, problem } = await listGalleryWithStatus();
  return (
    <>
      <PublicPageHero
        eyebrow="From the field"
        title="Gallery"
        description="Photos and videos of declogging, clearing and flood-control work across the country."
      />
      <PublicPageSection>
        <GalleryGrid items={items} problem={problem} />
      </PublicPageSection>
    </>
  );
}
