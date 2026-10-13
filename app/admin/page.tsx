import type { Metadata } from "next";
import { AdminApp } from "@/features/admin/components/admin-app";

export const metadata: Metadata = {
  title: "Admin",
  description: "Manage the OKB website and Command Center: visitors, photos and videos.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminApp />;
}
