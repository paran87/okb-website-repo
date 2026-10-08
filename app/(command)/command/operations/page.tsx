import type { Metadata } from "next";
import { OperationsView } from "@/features/operations/components/operations-view";

export const metadata: Metadata = { title: "Operations" };

export default function OperationsPage() {
  return <OperationsView />;
}
