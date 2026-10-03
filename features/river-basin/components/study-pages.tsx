"use client";

import { useEffect, useRef, useState } from "react";
import { getBlobStudyUrl } from "@/lib/river-basin/documents";
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
    rangeChunkSize: number;
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

function loadDocument(fileId: string): Promise<PdfDocument> {
  const cached = documentCache.get(fileId);
  if (cached) {
    return cached;
  }

  const pending = (async () => {
    ensureMapUpsert();
    const pdfjs = (await import("pdfjs-dist")) as unknown as PdfjsModule;
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.upsert.mjs";
    const open = (url: string) => {
      const task = pdfjs.getDocument({
        url,
        // Ranges are served by Vercel Blob's CDN (or forwarded to Google Drive
        // by the API fallback), so only the pages on screen are downloaded.
        // Streaming is off so pdf.js drops the initial full-file request once
        // it sees ranges are supported.
        disableRange: false,
        disableStream: true,
        disableAutoFetch: true,
        rangeChunkSize: 512 * 1024,
        // Scanned pages stay blank unless these image decoders are loaded.
        wasmUrl: WASM_URL,
      });
      return task.promise;
    };

    const apiUrl = `/api/river-basin/files/${fileId}`;
    const blobUrl = getBlobStudyUrl(fileId);
    if (!blobUrl) return open(apiUrl);
    try {
      return await open(blobUrl);
    } catch {
      // CDN copy unavailable: fall back to the Google Drive proxy.
      return open(apiUrl);
    }
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

export function StudyPages({
  fileId,
  title,
  onReady,
}: {
  fileId: string;
  title: string;
  onReady?: () => void;
}) {
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setError(null);

    loadDocument(fileId)
      .then((document) => {
        if (cancelled) return;
        setPdf(document);
        onReadyRef.current?.();
      })
      .catch((loadError: unknown) => {
        console.error(loadError);
        if (!cancelled) setError("This part of the study could not be opened.");
      });

    return () => {
      cancelled = true;
    };
  }, [fileId]);

  if (error) {
    return (
      <p className="text-muted-foreground px-6 py-16 text-center text-sm">
        {error}
      </p>
    );
  }

  if (!pdf) {
    return (
      <div className="px-6 py-16">
        <p className="text-muted-foreground text-center text-sm">
          Opening {title}…
        </p>
        <div className="bg-muted mx-auto mt-4 h-1.5 w-full max-w-md overflow-hidden rounded-full">
          <div className="bg-primary h-full w-1/3 animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <article className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <h2 className="text-foreground text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-xs">
          {pdf.numPages} {pdf.numPages === 1 ? "page" : "pages"}
        </p>
      </header>
      {Array.from({ length: pdf.numPages }, (_, index) => (
        <StudyPage
          key={`${fileId}-${index + 1}`}
          pdf={pdf}
          pageNumber={index + 1}
          eager={index < EAGER_PAGES}
        />
      ))}
    </article>
  );
}

function StudyPage({
  pdf,
  pageNumber,
  eager,
}: {
  pdf: PdfDocument;
  pageNumber: number;
  eager: boolean;
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
  }, [pdf, pageNumber, visible]);

  return (
    <div
      ref={frameRef}
      className="border-border relative overflow-hidden rounded-md border bg-white shadow-sm"
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
