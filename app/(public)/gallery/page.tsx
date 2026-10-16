import { PublicPageHero, PublicPageSection } from "@/components/public";
import { GalleryGrid } from "@/components/public/gallery/gallery-grid";
import { listGallerySections, listGalleryWithStatus } from "@/features/admin/server/media";
import { APP } from "@/lib/constants";
import { GALLERY_YOUTUBE_VIDEOS } from "@/lib/config/gallery-youtube";
import { GALLERY_DRIVE_VIDEOS } from "@/lib/config/gallery-drive-videos";

// Rendered once and refreshed every minute, so opening the page is instant instead of waiting on storage each time.
export const revalidate = 60;

export const metadata = {
  title: "Gallery",
  description: `Photos and videos from ${APP.program} flood-control operations.`,
};

/** Photos and videos the admin publishes (Admin → Media → Website · Gallery). */
export default async function GalleryPage() {
  const [{ items, problem }, sections] = await Promise.all([listGalleryWithStatus(), listGallerySections()]);
  return (
    <>
      <PublicPageHero
        eyebrow="From the field"
        title="Gallery"
        description="Photos and videos of declogging, clearing and flood-control work across the country."
        compact
      />
      <PublicPageSection className="py-6 sm:py-8">
        <GalleryGrid items={items} youtube={GALLERY_YOUTUBE_VIDEOS} driveVideos={GALLERY_DRIVE_VIDEOS} inspections={sections.inspections} summit={sections.summit} problem={problem} />
      </PublicPageSection>
    </>
  );
}
