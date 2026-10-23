import "server-only";
import { cache } from "react";
import { buildCoverage } from "@/features/accomplishment/lib/coverage";
import { getAccomplishment } from "@/features/accomplishment/server/accomplishment.service";
import { COVERAGE_FALLBACK, type Coverage } from "@/lib/config/okb-coverage";

/**
 * Where the program works, live from the OKB SSOT sheet (read at most every 10 minutes, SSOT_REVALIDATE_SECONDS).
 * When the sheet cannot be read, the October 8, 2026 snapshot.
 */
export const getCoverage = cache(async (): Promise<Coverage> => {
  try {
    const coverage = buildCoverage(await getAccomplishment());
    return coverage.regions.length ? coverage : COVERAGE_FALLBACK;
  } catch (error) {
    console.error("OKB coverage: SSOT sheet unreadable, showing the snapshot", error);
    return COVERAGE_FALLBACK;
  }
});
