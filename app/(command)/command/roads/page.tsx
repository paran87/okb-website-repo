import type { Metadata } from "next";
import { RoadNetworkView } from "@/features/road-network/components/road-network-view";

export const metadata: Metadata = {
  title: "Road Network",
  description:
    "Explore the DPWH national road network and expressways by class, region, province and district office, with flood-prone areas and incidents nearby.",
};

export default function RoadsPage() {
  return <RoadNetworkView />;
}
