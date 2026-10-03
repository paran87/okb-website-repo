"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import {
  getBlobStudyUrl,
  getStudyChunks,
  isNonPdfStudy,
} from "@/lib/river-basin/documents";
import { ensureMapUpsert } from "@/lib/river-basin/map-upsert-polyfill";

type PdfPage = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: {
    canvas: HTMLCanvasElement;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void>; cancel: () => void };
  cleanup: () => void;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy: () => Promise<void> | void;
};

type PdfjsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (params: {
    url: string;
    disableRange: boolean;
    disableStream: boolean;
    disableAutoFetch: boolean;
    rangeChunkSize?: number;
    wasmUrl: string;
  }) => {
    promise: Promise<PdfDocument>;
    onProgress: ((progress: { loaded: number; total: number }) => void) | null;
  };
};

const WASM_URL = "/pdfjs/wasm/";
const MAX_PARALLEL_RENDERS = 3;
/** Eager first pages so the study is readable the moment it opens. */
const EAGER_PAGES = 2;
let activeRenders = 0;
const renderQueue: Array<() => void> = [];

function acquireRender(isCancelled: () => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const start = () => {
      if (isCancelled()) {
        resolve(false);
        return;
      }
      if (activeRenders >= MAX_PARALLEL_RENDERS) {
        renderQueue.push(start);
        return;
      }
      activeRenders += 1;
      resolve(true);
    };
    start();
  });
}

function releaseRender(): void {
  activeRenders = Math.max(0, activeRenders - 1);
  while (activeRenders < MAX_PARALLEL_RENDERS && renderQueue.length > 0) {
    const before = activeRenders;
    renderQueue.shift()?.();
    if (activeRenders === before) continue;
  }
}

const MAX_CACHED_DOCUMENTS = 3;
const documentCache = new Map<string, Promise<PdfDocument>>();
const documentOrder: string[] = [];
/** Chunk files kept open per study; older ones are reloaded from the browser cache if needed. */
const MAX_OPEN_CHUNKS = 6;

async function loadPdfjs(): Promise<PdfjsModule> {
  ensureMapUpsert();
  const pdfjs = (await import("pdfjs-dist")) as unknown as PdfjsModule;
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.upsert.mjs";
  return pdfjs;
}

/**
 * A study split into small standalone PDFs behaves like one document: pages are
 * served from whichever chunk holds them, chunks load whole in a single request,
 * and the next chunk is fetched ahead of the reader.
 */
async function openChunkedDocument(
  fileId: string,
  info: { pages: number; per: number },
): Promise<PdfDocument> {
  const pdfjs = await loadPdfjs();
  const chunkCount = Math.ceil(info.pages / info.per);
  const open = new Map<number, Promise<PdfDocument>>();

  const load = (index: number): Promise<PdfDocument> => {
    const cached = open.get(index);
    if (cached) return cached;
    const task = pdfjs.getDocument({
      url: `/studies/chunks/${fileId}/${index}.pdf`,
      // Chunks are small: one plain request each, no range reads.
      disableRange: true,
      disableStream: false,
      disableAutoFetch: false,
      wasmUrl: WASM_URL,
    });
    const promise = task.promise;
    open.set(index, promise);
    promise.catch(() => open.delete(index));
    while (open.size > MAX_OPEN_CHUNKS) {
      const oldest = open.keys().next().value as number;
      if (oldest === index) break;
      const evicted = open.get(oldest);
      open.delete(oldest);
      void evicted?.then((doc) => doc.destroy()).catch(() => undefined);
    }
    return promise;
  };

  // Fail early (so the caller can fall back) if the first chunk is unavailable.
  await load(0);
  if (chunkCount > 1) void load(1).catch(() => undefined);

  return {
    numPages: info.pages,
    async getPage(pageNumber: number) {
      const index = Math.floor((pageNumber - 1) / info.per);
      const doc = await load(index);
      if (index + 1 < chunkCount) void load(index + 1).catch(() => undefined);
      return doc.getPage(((pageNumber - 1) % info.per) + 1);
    },
    async destroy() {
      const docs = [...open.values()];
      open.clear();
      await Promise.all(
        docs.map((doc) => doc.then((d) => d.destroy()).catch(() => undefined)),
      );
    },
  };
}

async function openWholeDocument(fileId: string): Promise<PdfDocument> {
  const pdfjs = await loadPdfjs();
  const open = (url: string) => {
    const task = pdfjs.getDocument({
      url,
      // Ranges are served by the R2 bucket (or forwarded to Google Drive by
      // the API fallback), so only the pages on screen are downloaded.
      // Streaming is off so pdf.js drops the initial full-file request once
      // it sees ranges are supported.
      disableRange: false,
      disableStream: true,
      disableAutoFetch: true,
      rangeChunkSize: 2 * 1024 * 1024,
      // Scanned pages stay blank unless these image decoders are loaded.
      wasmUrl: WASM_URL,
    });
    return task.promise;
  };

  const apiUrl = `/api/river-basin/files/${fileId}`;
  const storedUrl = getBlobStudyUrl(fileId);
  if (!storedUrl) return open(apiUrl);
  try {
    return await open(storedUrl);
  } catch {
    // Stored copy unavailable: fall back to the Google Drive proxy.
    return open(apiUrl);
  }
}

function loadDocument(fileId: string): Promise<PdfDocument> {
  const cached = documentCache.get(fileId);
  if (cached) {
    return cached;
  }

  const chunks = getStudyChunks(fileId);
  const pending = (async () => {
    if (chunks) {
      try {
        return await openChunkedDocument(fileId, chunks);
      } catch {
        // Chunks unavailable: fall back to the single-file viewer.
      }
    }
    return openWholeDocument(fileId);
  })();

  documentCache.set(fileId, pending);
  documentOrder.push(fileId);
  pending.catch(() => {
    documentCache.delete(fileId);
  });

  while (documentOrder.length > MAX_CACHED_DOCUMENTS) {
    const oldest = documentOrder.shift();
    if (!oldest || oldest === fileId) continue;
    const evicted = documentCache.get(oldest);
    documentCache.delete(oldest);
    void evicted?.then((document) => document.destroy()).catch(() => undefined);
  }

  return pending;
}

/** Page width at 100% zoom, in rem (matches the former max-w-4xl). */
const BASE_PAGE_REM = 56;

export function StudyPages({
  fileId,
  title,
  zoom = 1,
  jump,
  onReady,
  onPageChange,
}: {
  fileId: string;
  title: string;
  zoom?: number;
  /** Scrolls to a page whenever `n` changes. */
  jump?: { page: number; n: number };
  onReady?: (pages: number) => void;
  onPageChange?: (page: number) => void;
}) {
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const articleRef = useRef<HTMLElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const wordDocument = isNonPdfStudy(fileId);

  useEffect(() => {
    if (wordDocument) return;
    let cancelled = false;
    setPdf(null);
    setError(null);

    loadDocument(fileId)
      .then((document) => {
        if (cancelled) return;
        setPdf(document);
        onReadyRef.current?.(document.numPages);
      })
      .catch((loadError: unknown) => {
        console.error(loadError);
        if (!cancelled) setError("This part of the study could not be opened.");
      });

    return () => {
      cancelled = true;
    };
  }, [fileId, wordDocument, attempt]);

  // Report the page nearest the top of the scroll area.
  useEffect(() => {
    const article = articleRef.current;
    const root = article?.closest("[role=tabpanel]");
    if (!pdf || !article || !(root instanceof HTMLElement)) return;
    let frame = 0;
    let last = 0;
    const update = () => {
      frame = 0;
      const top = root.getBoundingClientRect().top + 96;
      const pages = article.querySelectorAll<HTMLElement>("[data-page]");
      let current = 1;
      for (const el of pages) {
        if (el.getBoundingClientRect().bottom > top) {
          current = Number(el.dataset.page);
          break;
        }
        current = Number(el.dataset.page);
      }
      if (current !== last) {
        last = current;
        onPageChangeRef.current?.(current);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pdf]);

  useEffect(() => {
    if (!jump || !pdf) return;
    const target = articleRef.current?.querySelector<HTMLElement>(
      `[data-page="${Math.min(Math.max(jump.page, 1), pdf.numPages)}"]`,
    );
    target?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump?.n, pdf]);

  if (wordDocument) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h2 className="text-foreground text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          This document is a Word file, so it cannot be previewed here.
        </p>
        <a
          href={`https://drive.google.com/file/d/${fileId}/view`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary text-primary-foreground mt-4 inline-flex rounded-md px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          Open in Google Drive
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[28rem] px-6 py-16 text-center">
        <p className="text-foreground text-sm font-medium">{error}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="bg-primary text-primary-foreground mt-4 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium hover:opacity-90"
        >
          <RotateCw className="size-4" aria-hidden />
          Try again
        </button>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div
        className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6"
        role="status"
        aria-live="polite"
      >
        <p className="text-muted-foreground text-center text-sm">
          Opening {title}…
        </p>
        <div className="bg-muted mx-auto h-1.5 w-full max-w-[28rem] overflow-hidden rounded-full">
          <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
        </div>
        <div className="aspect-[1/1.294] w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-200/90" />
      </div>
    );
  }

  return (
    <article
      ref={articleRef}
      className="mx-auto flex flex-col gap-4 px-4 py-6 sm:px-6"
      style={{
        width:
          zoom <= 1
            ? `min(100%, ${BASE_PAGE_REM * zoom}rem)`
            : `${BASE_PAGE_REM * zoom}rem`,
      }}
    >
      {Array.from({ length: pdf.numPages }, (_, index) => (
        <StudyPage
          key={`${fileId}-${index + 1}`}
          pdf={pdf}
          pageNumber={index + 1}
          eager={index < EAGER_PAGES}
          zoom={zoom}
        />
      ))}
    </article>
  );
}

function StudyPage({
  pdf,
  pageNumber,
  eager,
  zoom,
}: {
  pdf: PdfDocument;
  pageNumber: number;
  eager: boolean;
  zoom: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(eager);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const root = frame.closest("[role=tabpanel]");
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { root: root instanceof Element ? root : null, rootMargin: "160px 0px" },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!visible) {
      setPainted(false);
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
      }
      return;
    }
    if (!canvas) return;

    let cancelled = false;
    let started = false;
    let renderTask: { promise: Promise<void>; cancel: () => void } | null =
      null;

    (async () => {
      const granted = await acquireRender(() => cancelled);
      if (!granted) return;
      if (cancelled) {
        releaseRender();
        return;
      }
      started = true;
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) {
          page.cleanup();
          return;
        }
        const frame = frameRef.current;
        if (!frame) return;

        const base = page.getViewport({ scale: 1 });
        const width = Math.max(frame.clientWidth, 320);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
        const viewport = page.getViewport({
          scale: (width / base.width) * pixelRatio,
        });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "auto";

        renderTask = page.render({ canvas, viewport });
        await renderTask.promise;
        if (!cancelled) setPainted(true);
      } catch {
        // Cancelled when the page scrolls away or the study changes.
      } finally {
        if (started) releaseRender();
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, visible, zoom]);

  return (
    <div
      ref={frameRef}
      id={`study-page-${pageNumber}`}
      data-page={pageNumber}
      className="border-border relative scroll-mt-4 overflow-hidden rounded-md border bg-white shadow-sm"
    >
      {painted ? null : (
        <div
          className="aspect-[1/1.294] w-full animate-pulse bg-neutral-100"
          aria-hidden
        />
      )}
      <canvas
        ref={canvasRef}
        className={
          painted
            ? "relative block h-auto w-full bg-white"
            : "absolute inset-x-0 top-0 w-full"
        }
      />
    </div>
  );
}

/** Warm the PDF engine so the first study opens without a cold start. */
export function prefetchPdfEngine(): void {
  ensureMapUpsert();
  void import("pdfjs-dist").catch(() => undefined);
  void fetch("/pdf.worker.upsert.mjs").catch(() => undefined);
  void fetch("/pdf.worker.min.mjs").catch(() => undefined);
}
