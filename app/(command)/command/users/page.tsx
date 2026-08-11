import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ModulePage } from "@/components/layout/module-page";

export const metadata: Metadata = { title: "Users" };

export default function UsersPage() {
  return (
    <ModulePage
      title="Users"
      description="User administration, role-based access control, and audit trails."
      icon={Users}
    />
  );
}
