"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRetryPdf } from "@/features/consolidated-reports/hooks";
import type { ConsolidatedReport } from "@/features/consolidated-reports/types";

/** A report whose PDF could not be made: why, and a button that makes it again and queues it for the phone. */
export function PdfFailed({ r }: { r: ConsolidatedReport }) {
  const toast = useToast();
  const retry = useRetryPdf();
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant="danger" dot>
        PDF not generated
      </Badge>
      {r.pdfError ? <p className="break-words text-danger">{r.pdfError}</p> : null}
      <Button
        variant="outline"
        size="md"
        isLoading={retry.isPending}
        onClick={() =>
          retry.mutate(r.id, {
            onSuccess: (made) =>
              toast.success({
                title: "PDF made",
                description: made.pdfDelivery
                  ? "Queued for the bridge phone: it sends the PDF at its next check."
                  : "View or download it from the report.",
              }),
            onError: (err) =>
              toast.error({ title: "PDF still not made", description: err instanceof Error ? err.message : "The request failed." }),
          })
        }
        className="h-10 justify-center text-caption font-semibold"
        leftIcon={<RefreshCw className="size-4" aria-hidden />}
      >
        Make PDF again
      </Button>
    </div>
  );
}
