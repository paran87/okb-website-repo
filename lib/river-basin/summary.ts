import shapes from "@/lib/config/river-basin-shapes.json";
import { MAJOR_RIVER_BASINS } from "@/lib/config/river-basins";
import {
  editionYear,
  getBasinStudies,
  getStudyMeta,
  type StudyDocument,
} from "@/lib/river-basin/documents";
import { getBasinFacts } from "@/lib/river-basin/geo";

export type Island = "Luzon" | "Visayas" | "Mindanao";

const ISLAND_BY_SLUG: Record<string, Island> = {
  cagayan: "Luzon",
  pampanga: "Luzon",
  agno: "Luzon",
  abra: "Luzon",
  "pasig-marikina": "Luzon",
  bicol: "Luzon",
  "apayao-abulug": "Luzon",
  panay: "Visayas",
  jalaur: "Visayas",
  "ilog-hilabangan": "Visayas",
  mindanao: "Mindanao",
  agusan: "Mindanao",
  "ranao-agus": "Mindanao",
  davao: "Mindanao",
  "tagum-libuganon": "Mindanao",
  tagoloan: "Mindanao",
  "cagayan-de-oro": "Mindanao",
  "buayan-malungon": "Mindanao",
};

export interface BasinShape {
  d: string;
  w: number;
  h: number;
}

export interface BasinSummary {
  slug: string;
  number: number;
  label: string;
  island: Island;
  areaKm2: number | null;
  fsCount: number;
  mpCount: number;
  /** Distinct documents (a few cover both the study and the plan). */
  docCount: number;
  pages: number;
  latestYear: number | null;
  shape: BasinShape | null;
}

const shapeTable = shapes as Record<string, BasinShape>;

/** Directory card data for one basin (server side; counts come from the document catalog). */
export function getBasinSummary(slug: string): BasinSummary | undefined {
  const basin = MAJOR_RIVER_BASINS.find((b) => b.slug === slug);
  if (!basin) return undefined;
  const studies = getBasinStudies(slug);
  const unique = new Map<string, StudyDocument>();
  for (const doc of [
    ...(studies?.feasibility ?? []),
    ...(studies?.masterPlan ?? []),
  ])
    unique.set(doc.id, doc);
  const years = [...unique.values()]
    .map((d) => editionYear(d.edition))
    .filter((y) => y > 0);
  return {
    slug,
    number: basin.number,
    label: basin.label,
    island: ISLAND_BY_SLUG[slug] ?? "Luzon",
    areaKm2: getBasinFacts(slug)?.areaKm2 ?? null,
    fsCount: studies?.feasibility.length ?? 0,
    mpCount: studies?.masterPlan.length ?? 0,
    docCount: unique.size,
    pages: [...unique.keys()].reduce(
      (sum, id) => sum + (getStudyMeta(id)?.pages ?? 0),
      0,
    ),
    latestYear: years.length ? Math.max(...years) : null,
    shape: shapeTable[slug] ?? null,
  };
}

export function getAllBasinSummaries(): BasinSummary[] {
  return MAJOR_RIVER_BASINS.map((b) => getBasinSummary(b.slug)).filter(
    (s): s is BasinSummary => Boolean(s),
  );
}

/** Neighbouring basins in catalog order, for previous / next links. */
export function getAdjacentBasins(slug: string): {
  prev: BasinSummary | null;
  next: BasinSummary | null;
} {
  const index = MAJOR_RIVER_BASINS.findIndex((b) => b.slug === slug);
  const at = (i: number) =>
    i >= 0 && i < MAJOR_RIVER_BASINS.length
      ? (getBasinSummary(MAJOR_RIVER_BASINS[i]!.slug) ?? null)
      : null;
  return { prev: at(index - 1), next: at(index + 1) };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  return bytes >= 1e9
    ? `${(bytes / 1e9).toFixed(1)} GB`
    : `${Math.round(bytes / 1e6)} MB`;
}
