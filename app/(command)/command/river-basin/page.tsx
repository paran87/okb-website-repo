import type { Metadata } from "next";
import Link from "next/link";
import { Mountain } from "lucide-react";
import { MAJOR_RIVER_BASINS } from "@/lib/config/river-basins";
import { ROUTES } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "River Basin",
  description:
    "The 18 major river basins and their feasibility studies and master plans.",
};

export default function RiverBasinPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="River Basin"
        description="Eighteen major river basins. Open a basin to read its feasibility study and master plan."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "River Basin" },
        ]}
      />
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {MAJOR_RIVER_BASINS.map((basin) => (
          <li key={basin.slug}>
            <Link
              href={`${ROUTES.riverBasin}/${basin.slug}`}
              className="border-border bg-card hover:border-primary/40 hover:bg-muted/40 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors"
            >
              <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold">
                {basin.number}
              </span>
              <span className="min-w-0">
                <span className="text-foreground block truncate font-medium">
                  {basin.label}
                </span>
                <span className="text-muted-foreground block text-xs">
                  Major river basin
                </span>
              </span>
              <Mountain
                className="text-muted-foreground ml-auto size-4 shrink-0"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
