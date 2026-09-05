import { OkbFrameworkStory } from "@/components/public/okb-framework-story";
import { APP } from "@/lib/constants";

export const metadata = {
  title: "OKB Framework",
  description: `Operational Framework of ${APP.program} — ridge-to-reef flood mitigation, maintenance cycles, and nationwide coordination.`,
};

export default function OkbFrameworkPage() {
  return <OkbFrameworkStory />;
}
