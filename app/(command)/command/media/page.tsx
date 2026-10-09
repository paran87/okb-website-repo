import type { Metadata } from "next";
import { MediaView } from "@/features/media-collector/components/media-view";

export const metadata: Metadata = { title: "OKB Media" };

export default function MediaPage() {
  return <MediaView />;
}
