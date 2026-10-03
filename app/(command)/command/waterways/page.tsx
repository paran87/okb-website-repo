import type { Metadata } from "next";
import { WaterwaysView } from "@/features/waterways/components/waterways-view";

export const metadata: Metadata = {
  title: "Waterways",
  description:
    "Explore the DENR INREMP river system: 284,000 river segments by upper river basin and flow, with hazard layers and nearby flood-prone areas.",
};

export default function WaterwaysPage() {
  return <WaterwaysView />;
}
