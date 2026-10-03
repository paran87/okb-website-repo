"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  BookOpenText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Map as MapIcon,
  Minus,
  Plus,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";
import {
  getBlobStudyUrl,
  getStudyMeta,
  groupByEdition,
  isNonPdfStudy,
  type BasinStudies,
  type StudyDocument,
} from "@/lib/river-basin/documents";
import { formatBytes, type BasinSummary } from "@/lib/river-basin/summary";
import { cn } from "@/utils/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { BasinOutline } from "@/features/river-basin/components/basin-shape";
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

const ZOOMS = [0.6, 0.75, 1, 1.25, 1.5, 2];

const ISLAND_TONE = {
  Luzon: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  Visayas: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Mindanao: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
} as const;

export function BasinStudy({
  basin,
  summary,
  prev,
  next,
  studies,
}: {
  basin: { number: number; label: string; slug: string };
  summary: BasinSummary;
  prev: BasinSummary | null;
  next: BasinSummary | null;
  studies: BasinStudies;
}) {
  const [tab, setTab] = useState<TabId>(
    studies.feasibility.length || !studies.masterPlan.length
      ? "feasibility"
      : "master-plan",
  );
  const docTab: DocTab = tab === "map" ? "feasibility" : tab;
  const documents =
    docTab === "feasibility" ? studies.feasibility : studies.masterPlan;
  const editions = useMemo(() => groupByEdition(documents), [documents]);
  const [selected, setSelected] = useState<Record<DocTab, string>>({
    feasibility: "",
    "master-plan": "",
  });
  const [listOpen, setListOpen] = useState(false);

  const activeDocument =
    documents.find((d) => d.id === selected[docTab]) ?? documents[0];

  const selectDocument = (id: string) => {
    setSelected((prevSel) => ({ ...prevSel, [docTab]: id }));
    setListOpen(false);
  };

  const tabs: {
    id: TabId;
    label: string;
    count?: number;
    icon: typeof MapIcon;
  }[] = [
    {
      id: "feasibility",
      label: "Feasibility Study",
      count: studies.feasibility.length,
      icon: FileText,
    },
    {
      id: "master-plan",
      label: "Master Plan",
      count: studies.masterPlan.length,
      icon: BookOpenText,
    },
    { id: "map", label: "Show Map", icon: MapIcon },
  ];

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <header className="border-border bg-background relative z-10 shrink-0 border-b px-4 pt-3 md:px-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={ROUTES.riverBasin}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            All river basins
          </Link>
          <nav aria-label="Neighbouring basins" className="flex gap-1">
            <BasinNav basin={prev} dir="prev" />
            <BasinNav basin={next} dir="next" />
          </nav>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="bg-primary/5 text-primary flex size-12 shrink-0 items-center justify-center rounded-lg p-1.5 sm:size-14">
            <BasinOutline
              shape={summary.shape}
              className="max-h-full max-w-full"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-foreground text-lg leading-tight font-semibold break-words sm:text-xl">
              <span className="text-muted-foreground font-mono text-sm">
                {String(basin.number).padStart(2, "0")}
              </span>{" "}
              {basin.label} River Basin
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                  ISLAND_TONE[summary.island],
                )}
              >
                {summary.island}
              </span>
              {summary.areaKm2 ? (
                <span className="text-muted-foreground">
                  {Math.round(summary.areaKm2).toLocaleString()} km²
                </span>
              ) : null}
              <span className="text-muted-foreground">
                {summary.docCount}{" "}
                {summary.docCount === 1 ? "document" : "documents"}
                {summary.pages
                  ? ` · ${summary.pages.toLocaleString()} pages`
                  : ""}
              </span>
            </p>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Basin content"
          className="mt-3 flex gap-1 overflow-x-auto"
        >
          {tabs.map((item) => {
            const active = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={cn(
                  "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
                {item.count !== undefined ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-px font-mono text-[10px]",
                      active
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      {tab === "map" ? (
        <div
          role="tabpanel"
          className="bg-muted/30 min-h-0 flex-1 overflow-hidden"
        >
          <BasinMap slug={basin.slug} label={basin.label} />
        </div>
      ) : activeDocument ? (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {documents.length > 1 ? (
            <>
              <div className="border-border bg-card shrink-0 border-b lg:hidden">
                <button
                  type="button"
                  onClick={() => setListOpen((v) => !v)}
                  aria-expanded={listOpen}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
                >
                  <FolderOpen
                    className="text-primary size-4 shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-muted-foreground block text-[10px] font-medium uppercase">
                      Document ({documents.length})
                    </span>
                    <span className="text-foreground block truncate text-sm font-medium">
                      {activeDocument.title}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "text-muted-foreground size-4 shrink-0 transition-transform",
                      listOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                </button>
                {listOpen ? (
                  <div className="border-border max-h-[45vh] overflow-y-auto border-t p-2">
                    <DocumentList
                      editions={editions}
                      activeId={activeDocument.id}
                      onSelect={selectDocument}
                    />
                  </div>
                ) : null}
              </div>
              <aside className="border-border bg-card hidden w-72 shrink-0 overflow-y-auto border-r p-3 lg:block xl:w-80">
                <DocumentList
                  editions={editions}
                  activeId={activeDocument.id}
                  onSelect={selectDocument}
                />
              </aside>
            </>
          ) : null}
          <Reader key={activeDocument.id} document={activeDocument} />
        </div>
      ) : (
        <div
          role="tabpanel"
          className="bg-muted/30 min-h-0 flex-1 overflow-y-auto"
        >
          <EmptyState
            title={`No ${docTab === "feasibility" ? "feasibility study" : "master plan"} on file`}
            description={`The ${basin.label} river basin does not have this document in the collection yet.${
              (docTab === "feasibility"
                ? studies.masterPlan.length
                : studies.feasibility.length) > 0
                ? ` Try the ${docTab === "feasibility" ? "Master Plan" : "Feasibility Study"} tab.`
                : ""
            }`}
            className="min-h-full"
          />
        </div>
      )}
    </div>
  );
}

function BasinNav({
  basin,
  dir,
}: {
  basin: BasinSummary | null;
  dir: "prev" | "next";
}) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  const label = dir === "prev" ? "Previous basin" : "Next basin";
  if (!basin)
    return (
      <span
        aria-hidden
        className="text-muted-foreground/30 inline-flex size-8 items-center justify-center"
      >
        <Icon className="size-4" />
      </span>
    );
  return (
    <Link
      href={`${ROUTES.riverBasin}/${basin.slug}`}
      title={`${label}: ${basin.label}`}
      aria-label={`${label}: ${basin.label}`}
      className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium"
    >
      {dir === "prev" ? <Icon className="size-4" aria-hidden /> : null}
      <span className="hidden max-w-[7rem] truncate sm:inline">
        {basin.label}
      </span>
      {dir === "next" ? <Icon className="size-4" aria-hidden /> : null}
    </Link>
  );
}

function DocumentList({
  editions,
  activeId,
  onSelect,
}: {
  editions: { name: string; documents: StudyDocument[] }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {editions.map((edition) => (
        <section key={edition.name}>
          <h2 className="text-muted-foreground px-2 pb-1 text-[11px] font-semibold tracking-wide uppercase">
            {edition.name}
          </h2>
          <ul className="space-y-1">
            {edition.documents.map((doc) => {
              const meta = getStudyMeta(doc.id);
              const word = isNonPdfStudy(doc.id);
              const active = doc.id === activeId;
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(doc.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10"
                        : "hover:bg-muted/60 border-transparent",
                    )}
                  >
                    <FileText
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm leading-snug break-words",
                          active
                            ? "text-primary font-medium"
                            : "text-foreground",
                        )}
                      >
                        {doc.title}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-[11px]">
                        {word
                          ? "Word document"
                          : meta
                            ? `${meta.pages} pages${meta.bytes ? ` · ${formatBytes(meta.bytes)}` : ""}`
                            : "PDF"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Reader({ document: doc }: { document: StudyDocument }) {
  const word = isNonPdfStudy(doc.id);
  const [zoom, setZoom] = useState(1);
  const [pages, setPages] = useState(getStudyMeta(doc.id)?.pages ?? 0);
  const [page, setPage] = useState(1);
  const [jump, setJump] = useState<{ page: number; n: number }>();
  const [draft, setDraft] = useState<string | null>(null);

  const goTo = (target: number) => {
    if (!pages || Number.isNaN(target)) return;
    setJump((j) => ({
      page: Math.min(Math.max(target, 1), pages),
      n: (j?.n ?? 0) + 1,
    }));
  };
  const onReady = useCallback((count: number) => setPages(count), []);

  const zoomIndex = ZOOMS.indexOf(zoom);
  const stepZoom = (delta: number) => {
    const next =
      ZOOMS[Math.min(Math.max(zoomIndex + delta, 0), ZOOMS.length - 1)];
    if (next) setZoom(next);
  };

  const fileUrl = word
    ? `https://drive.google.com/file/d/${doc.id}/view`
    : (getBlobStudyUrl(doc.id) ?? `/api/river-basin/files/${doc.id}`);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="border-border bg-background flex shrink-0 items-center gap-2 border-b px-3 py-2 md:px-4">
        <div className="min-w-0 flex-1">
          <p
            className="text-foreground truncate text-sm font-medium"
            title={doc.title}
          >
            {doc.title}
          </p>
          <p className="text-muted-foreground truncate text-[11px]">
            {doc.edition}
          </p>
        </div>
        {!word && pages > 0 ? (
          <>
            <form
              className="text-muted-foreground flex items-center gap-1 text-xs"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft !== null) goTo(parseInt(draft, 10));
                setDraft(null);
              }}
            >
              <label className="sr-only" htmlFor="study-page-input">
                Go to page
              </label>
              <input
                id="study-page-input"
                inputMode="numeric"
                value={draft ?? String(page)}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
                onFocus={(e) => e.currentTarget.select()}
                onBlur={() => setDraft(null)}
                className="border-border bg-card text-foreground focus:ring-ring h-8 w-12 rounded-md border text-center font-mono text-xs outline-none focus:ring-2"
              />
              <span className="font-mono">/ {pages}</span>
            </form>
            <div className="border-border hidden items-center rounded-md border sm:flex">
              <button
                type="button"
                onClick={() => stepZoom(-1)}
                disabled={zoomIndex <= 0}
                aria-label="Zoom out"
                className="hover:bg-muted inline-flex size-8 items-center justify-center rounded-l-md disabled:opacity-40"
              >
                <Minus className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                aria-label="Reset zoom"
                className="hover:bg-muted h-8 w-12 font-mono text-xs"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => stepZoom(1)}
                disabled={zoomIndex >= ZOOMS.length - 1}
                aria-label="Zoom in"
                className="hover:bg-muted inline-flex size-8 items-center justify-center rounded-r-md disabled:opacity-40"
              >
                <Plus className="size-3.5" aria-hidden />
              </button>
            </div>
          </>
        ) : null}
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          {...(word ? {} : { download: `${doc.title}.pdf` })}
          title={word ? "Open in Google Drive" : "Download PDF"}
          aria-label={word ? "Open in Google Drive" : "Download PDF"}
          className="border-border hover:bg-muted inline-flex size-8 items-center justify-center rounded-md border"
        >
          {word ? (
            <ExternalLink className="size-4" aria-hidden />
          ) : (
            <Download className="size-4" aria-hidden />
          )}
        </a>
      </div>
      <div role="tabpanel" className="bg-muted/40 min-h-0 flex-1 overflow-auto">
        <StudyPages
          fileId={doc.id}
          title={doc.title}
          zoom={zoom}
          jump={jump}
          onReady={onReady}
          onPageChange={setPage}
        />
      </div>
    </section>
  );
}
