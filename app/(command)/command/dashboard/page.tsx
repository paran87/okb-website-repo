import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

/** Alias route — dashboard lives at `/command`. */
export default function DashboardAliasPage() {
  redirect(ROUTES.dashboard);
}
