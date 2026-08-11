import { ProfileGallery, PublicPageHero } from "@/components/public";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "Profile",
  description: `Program portfolio and briefing materials for ${APP.program} — Office of Undersecretary for Special Concerns.`,
};

export default function ProfilePage() {
  return (
    <>
      <PublicPageHero
        eyebrow="DPWH · Office of Undersecretary for Special Concerns"
        title="Program Profile"
        description="Official Oplan Kontra Baha portfolio — program overview, launches, field operations, inter-agency coordination, and nationwide waterway rehabilitation."
      />
      <ProfileGallery />
    </>
  );
}
