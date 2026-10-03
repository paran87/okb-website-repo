"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import {
  groupByEdition,
  type BasinStudies,
  type StudyDocument,
} from "@/lib/river-basin/documents";
import { cn } from "@/utils/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { StudyPages } from "@/features/river-basin/components/study-pages";

type DocTab = "feasibility" | "master-plan";
type TabId = DocTab | "map";

const BasinMap = dynamic(
  () =>
    import("@/features/river-basin/components/basin-map").then((m) => ({
      default: m.BasinMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[520px] items-center justify-center">
        <div className="border-primary size-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    ),
  },
);

const TABS: { id: TabId; label: string }[] = [
  { id: "feasibility", label: "Feasibility Study" },
  { id: "master-plan", label: "Master Plan" },
  { id: "map", label: "Show Map" },
];

export function BasinStudy({
  basin,
  studies,
}: {
  basin: { number: number; label: string; slug: string };
  studies: BasinStudies;
}) {
  const [tab, setTab] = useState<TabId>("feasibility");
  const [docTab, setDocTab] = useState<DocTab>("feasibility");
  const documents =
    docTab === "feasibility" ? studies.feasibility : studies.masterPlan;
  const editions = groupByEdition(documents);
  const [editionName, setEditionName] = useState(editions[0]?.name ?? "");
  const [documentId, setDocumentId] = useState(
    editions[0]?.documents[0]?.id ?? "",
  );

  const activeEdition =
    editions.find((edition) => edition.name === editionName) ?? editions[0];
  const activeDocument =
    activeEdition?.documents.find((document) => document.id === documentId) ??
    activeEdition?.documents[0];

  const selectTab = (next: TabId) => {
    if (next === "map") {
      setTab("map");
      return;
    }
    setDocTab(next);
    const nextDocuments =
      next === "feasibility" ? studies.feasibility : studies.masterPlan;
    const nextEditions = groupByEdition(nextDocuments);
    setTab(next);
    setEditionName(nextEditions[0]?.name ?? "");
    setDocumentId(nextEditions[0]?.documents[0]?.id ?? "");
  };

  const selectEdition = (name: string) => {
    const edition = editions.find((item) => item.name === name);
    setEditionName(name);
    setDocumentId(edition?.documents[0]?.id ?? "");
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="border-border bg-background relative z-10 shrink-0 border-b px-4 py-3 md:px-5">
        <Link
          href={ROUTES.riverBasin}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          River basins
        </Link>
        <h1 className="text-foreground mt-1 text-base font-semibold">
          {basin.number}. {basin.label} River Basin
        </h1>
        <div
          role="tablist"
          aria-label="Study documents"
          className="border-border mt-3 flex gap-1 border-b"
        >
          {TABS.map((item) => {
            const selected = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => selectTab(item.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {tab !== "map" && activeDocument ? (
          <StudyPicker
            editions={editions}
            editionName={activeEdition?.name ?? ""}
            onEditionChange={selectEdition}
            documents={activeEdition?.documents ?? []}
            documentId={activeDocument.id}
            onDocumentChange={setDocumentId}
          />
        ) : null}
      </header>

      <div
        role="tabpanel"
        className={cn(
          "bg-muted/30 min-h-0 flex-1",
          tab === "map" ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        {tab === "map" ? (
          <BasinMap slug={basin.slug} label={basin.label} />
        ) : activeDocument ? (
          <StudyPages
            key={activeDocument.id}
            fileId={activeDocument.id}
            title={activeDocument.title}
          />
        ) : (
          <EmptyState
            title={`No ${docTab === "feasibility" ? "feasibility study" : "master plan"} on file`}
            description={`The ${basin.label} river basin does not have this document in the collection yet.`}
            className="min-h-full"
          />
        )}
      </div>
    </div>
  );
}

function StudyPicker({
  editions,
  editionName,
  onEditionChange,
  documents,
  documentId,
  onDocumentChange,
}: {
  editions: { name: string; documents: StudyDocument[] }[];
  editionName: string;
  onEditionChange: (name: string) => void;
  documents: StudyDocument[];
  documentId: string;
  onDocumentChange: (id: string) => void;
}) {
  const showEdition = editions.length > 1;
  const showPart = documents.length > 1;
  if (!showEdition && !showPart) return null;

  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
      {showEdition ? (
        <label className="block w-full max-w-[16rem] shrink-0">
          <span className="sr-only">Study edition</span>
          <select
            value={editionName}
            onChange={(event) => onEditionChange(event.target.value)}
            className="border-border bg-card text-foreground h-10 w-full truncate rounded-lg border px-3 text-sm"
          >
            {editions.map((edition) => (
              <option key={edition.name} value={edition.name}>
                {edition.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showPart ? (
        <label className="block w-full max-w-[36rem] shrink-0">
          <span className="sr-only">Study part</span>
          <select
            value={documentId}
            onChange={(event) => onDocumentChange(event.target.value)}
            className="border-border bg-card text-foreground h-10 w-full truncate rounded-lg border px-3 text-sm"
          >
            {documents.map((document, index) => (
              <option key={document.id} value={document.id}>
                {index + 1}. {document.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
