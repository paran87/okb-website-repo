import { redirect } from "next/navigation";

/** NCR Daily Accomplishment now lives in the Gallery; old links land on its tab. */
export default function NcrDailyAccomplishmentPage() {
  redirect("/gallery#ncr-daily");
}
