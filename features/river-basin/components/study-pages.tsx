"use client";

import { useEffect, useRef, useState } from "react";

type PdfPage = {
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: {
    canvas: null;
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
    transform: number[];
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
  }) => {
    promise: Promise<PdfDocument>;
    destroy: () => void;
    onProgress: ((progress: { loaded: number; total: number }) => void) | null;
  };
};

export function StudyPages({
  fileId,
  title,
}: {
  fileId: string;
  title: string;
}) {
  const [pdf, setPdf] = useState<PdfDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => void } | null = null;
    let pdfDoc: PdfDocument | null = null;

    setPdf(null);
    setError(null);
    setProgress(0);

    (async () => {
      try {
        const pdfjs = (await import("pdfjs-dist")) as unknown as PdfjsModule;
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({
          url: `/api/river-basin/files/${fileId}`,
          disableRange: true,
          disableStream: true,
        });
        loadingTask = task;
        task.onProgress = ({ loaded, total }) => {
          if (!cancelled && total > 0)
            setProgress(Math.round((loaded / total) * 100));
        };
        pdfDoc = await task.promise;
        if (cancelled) {
          await pdfDoc.destroy();
          return;
        }
        setPdf(pdfDoc);
      } catch (error) {
        console.error(error);
        if (!cancelled) setError("This part of the study could not be opened.");
      }
    })();

    return () => {
      cancelled = true;
      try {
        loadingTask?.destroy();
      } catch {
        // The loading task may already be finished.
      }
      try {
        void pdfDoc?.destroy();
      } catch {
        // The document may already be destroyed with the loading task.
      }
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
      <p className="text-muted-foreground px-6 py-16 text-center text-sm">
        Opening {title}
        {progress > 0 ? ` (${progress}%)` : "…"}
      </p>
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
        />
      ))}
    </article>
  );
}

function StudyPage({
  pdf,
  pageNumber,
}: {
  pdf: PdfDocument;
  pageNumber: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry?.isIntersecting ?? false),
      { rootMargin: "900px 0px" },
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
    let renderTask: { promise: Promise<void>; cancel: () => void } | null =
      null;

    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) {
        page.cleanup();
        return;
      }
      const context = canvas.getContext("2d");
      const frame = frameRef.current;
      if (!context || !frame) return;

      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(Math.max(frame.clientWidth, 320) / base.width, 2);
      const viewport = page.getViewport({ scale });
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = "100%";
      canvas.style.height = "auto";

      renderTask = page.render({
        canvas: null,
        canvasContext: context,
        viewport,
        transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });
      try {
        await renderTask.promise;
        if (!cancelled) setPainted(true);
      } catch {
        // Cancelled when the page scrolls away or the study changes.
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
      <canvas
        ref={canvasRef}
        className={painted ? "block h-auto w-full bg-white" : "hidden"}
      />
      {painted ? null : (
        <div className="bg-muted/40 aspect-[1/1.294] w-full" aria-hidden />
      )}
    </div>
  );
}
