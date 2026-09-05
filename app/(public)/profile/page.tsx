import { ProfileGallery } from "@/components/public";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "Portfolio",
  description: `Program portfolio and briefing materials for ${APP.program} — Office of Undersecretary for Special Concerns.`,
};

export default function ProfilePage() {
  return <ProfileGallery />;
}
