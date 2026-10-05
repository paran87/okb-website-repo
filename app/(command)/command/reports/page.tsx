import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

/** The Reports group opens on the Incoming Reports inbox. */
export default function ReportsIndexPage() {
  redirect(ROUTES.reportsIncoming);
}
