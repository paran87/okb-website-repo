import type { Metadata } from "next";
import Link from "next/link";
import { Mountain } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MAJOR_RIVER_BASINS } from "@/lib/config/river-basins";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "River Basin",
  description: "The 18 major river basins and their master plan and feasibility study files.",
};

export default function RiverBasinPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="River Basin"
        description="Eighteen major river basins. Open a basin for its master plan and feasibility study files."
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
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
                {basin.number}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">
                  {basin.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Major river basin
                </span>
              </span>
              <Mountain className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
