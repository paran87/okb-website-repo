"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ROUTES } from "@/lib/constants";
import type { ReportsAccessState } from "@/features/reports/types";
import { ReportsGate } from "@/features/reports/components/reports-gate";

/** Standard Reports-module page: breadcrumb header + operator access gate. */
export function ReportsPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: (access: ReportsAccessState) => ReactNode;
}) {
  return (
    <div className="space-y-3 sm:space-y-5">
      <PageHeader
        compact
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Reports", href: ROUTES.reportsIncoming },
          { label: title },
        ]}
      />
      <ReportsGate>{children}</ReportsGate>
    </div>
  );
}
