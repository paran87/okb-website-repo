import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ROUTES } from "@/lib/constants";

interface ModulePageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

/** Foundation scaffold for a feature module awaiting implementation. */
export function ModulePage({ title, description, icon }: ModulePageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: title },
        ]}
      />
      <Card>
        <CardContent>
          <EmptyState
            icon={icon}
            title="Coming soon..."
            titleClassName="text-3xl font-semibold tracking-tight sm:text-4xl"
          />
        </CardContent>
      </Card>
    </div>
  );
}
