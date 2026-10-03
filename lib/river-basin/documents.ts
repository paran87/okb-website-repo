import blobManifest from "@/lib/config/river-basin-blob.json";
import catalog from "@/lib/config/river-basin-documents.json";
import studyStorage from "@/lib/config/study-storage.json";

export type StudyDocument = {
  id: string;
  title: string;
  edition: string;
};

export type BasinStudies = {
  feasibility: StudyDocument[];
  masterPlan: StudyDocument[];
};

type RawBasin = BasinStudies & {
  unclassified: StudyDocument[];
};

const data = catalog as Record<string, RawBasin>;

function editionYear(edition: string): number {
  const years = [...edition.matchAll(/(?:19|20)\d{2}/g)]
    .map((match) => match[0])
    .filter((year): year is string => Boolean(year))
    .map(Number);
  return years.length > 0 ? Math.max(...years) : 0;
}

function sortDocuments(documents: StudyDocument[]): StudyDocument[] {
  return [...documents].sort((a, b) => {
    const byYear = editionYear(b.edition) - editionYear(a.edition);
    if (byYear !== 0) return byYear;
    const byEdition = a.edition.localeCompare(b.edition);
    if (byEdition !== 0) return byEdition;
    return a.title.localeCompare(b.title, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function coversBothStudies(title: string): boolean {
  return /master plan and feasibility|feasibility and master|\bmp and fs\b|\bfs and mp\b/i.test(
    title,
  );
}

/** Feasibility study and master plan documents for one major river basin. */
export function getBasinStudies(slug: string): BasinStudies | undefined {
  const raw = data[slug];
  if (!raw) return undefined;

  const feasibility = [...raw.feasibility];
  const masterPlan = [...raw.masterPlan];

  for (const document of raw.unclassified) {
    if (coversBothStudies(document.title)) {
      feasibility.push(document);
      masterPlan.push(document);
    } else {
      masterPlan.push(document);
    }
  }

  return {
    feasibility: sortDocuments(feasibility),
    masterPlan: sortDocuments(masterPlan),
  };
}

export type StudyEdition = {
  name: string;
  documents: StudyDocument[];
};

/** Keep edition groups in the same order as the sorted document list. */
export function groupByEdition(documents: StudyDocument[]): StudyEdition[] {
  const groups = new Map<string, StudyDocument[]>();
  for (const document of documents) {
    const existing = groups.get(document.edition);
    if (existing) existing.push(document);
    else groups.set(document.edition, [document]);
  }
  return [...groups.entries()].map(([name, docs]) => ({
    name,
    documents: docs,
  }));
}

const allowedFileIds = new Set<string>();
for (const raw of Object.values(data)) {
  for (const document of [
    ...raw.feasibility,
    ...raw.masterPlan,
    ...raw.unclassified,
  ]) {
    allowedFileIds.add(document.id);
  }
}

/** True when the id is one of the published basin study files. */
export function isRiverBasinFile(fileId: string): boolean {
  return allowedFileIds.has(fileId);
}

const blobUrls = blobManifest as Record<string, string>;

/**
 * Same-origin path of the optimized study (next.config.ts rewrites it to the R2
 * bucket), once the PDFs have been uploaded. Same-origin avoids CORS preflights
 * on `Range` requests. Undefined falls back to the Google Drive route.
 */
export function getBlobStudyUrl(fileId: string): string | undefined {
  return studyStorage.origin && blobUrls[fileId]
    ? `/studies/${fileId}.pdf`
    : undefined;
}
