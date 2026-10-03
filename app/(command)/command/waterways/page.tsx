import type { Metadata } from "next";
import { WaterwaysWorkspace } from "./waterways-workspace";

export const metadata: Metadata = {
  title: "Waterways",
  description:
    "Live city waterway monitoring. Bacoor City Waterways is available now.",
};

export default function WaterwaysPage() {
  return <WaterwaysWorkspace />;
}
