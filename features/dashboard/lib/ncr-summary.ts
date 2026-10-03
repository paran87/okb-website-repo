import { floodProneService } from "@/features/flood-prone/services/flood-prone.service";

export interface NcrBreakdownRow {
  label: string;
  count: number;
  located: number;
}

export interface NcrSummary {
  total: number;
  located: number;
  needsReview: number;
  deoCount: number;
  municipalityCount: number;
  byDeo: NcrBreakdownRow[];
  byMunicipality: NcrBreakdownRow[];
}

function group(
  records: ReturnType<typeof floodProneService.getRecords>,
  key: "deo" | "municipality",
): NcrBreakdownRow[] {
  const rows = new Map<string, NcrBreakdownRow>();
  for (const record of records) {
    const label = record[key] || "Unspecified";
    const row = rows.get(label) ?? { label, count: 0, located: 0 };
    row.count += 1;
    if (record.status === "located") row.located += 1;
    rows.set(label, row);
  }
  return [...rows.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

/** Active-incident totals derived from the NCR Critical Areas records. */
export function getNcrSummary(): NcrSummary {
  const records = floodProneService.getRecords();
  const located = records.filter((r) => r.status === "located").length;
  const byDeo = group(records, "deo");
  const byMunicipality = group(records, "municipality");
  return {
    total: records.length,
    located,
    needsReview: records.length - located,
    deoCount: byDeo.length,
    municipalityCount: byMunicipality.length,
    byDeo,
    byMunicipality,
  };
}
