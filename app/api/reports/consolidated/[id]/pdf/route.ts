import { type NextRequest, NextResponse } from "next/server";
import { withApiHandler } from "@/lib/api/handler";
import { requireReportsAccess } from "@/features/reports/server/access";
import { fetchPdf } from "@/features/consolidated-reports/server/bridge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** View (inline) or download (?download=1) a generated consolidated report PDF. */
export const GET = withApiHandler(async (request: NextRequest, { params }) => {
  await requireReportsAccess(request);
  const { bytes, fileName } = await fetchPdf((await params).id ?? "");
  const disposition = request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${fileName.replace(/[^\w.-]/g, "_")}"`,
      "Cache-Control": "private, no-store",
    },
  });
});
