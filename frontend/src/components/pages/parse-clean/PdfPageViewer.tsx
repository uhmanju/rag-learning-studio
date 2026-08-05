import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// pdf.js needs its worker script loaded separately from the main bundle.
// Pointed at cdnjs (already an approved external source elsewhere in
// this app's build) rather than trying to bundle the worker file through
// Vite, which needs extra config pdf.js's own docs recommend avoiding
// unless you specifically need an offline build.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// One parsed PDF document per File, shared across every page's canvas
// instead of re-parsing the same bytes once per page — a document might
// have many pages, each rendering its own PdfPageViewer.
const documentCache = new WeakMap<File, Promise<pdfjsLib.PDFDocumentProxy>>();

function loadDocument(file: File): Promise<pdfjsLib.PDFDocumentProxy> {
  let cached = documentCache.get(file);
  if (!cached) {
    cached = file.arrayBuffer().then((buf) => pdfjsLib.getDocument({ data: buf }).promise);
    documentCache.set(file, cached);
  }
  return cached;
}

interface Props {
  file: File;
  pageNumber: number;
}

/** Renders one real page of the actual uploaded PDF onto a canvas — the
 *  real "Original PDF" view Parse was missing, available whenever a
 *  genuine PDF file exists (Offline Mode uploads; Demo Mode's bundled
 *  samples have no real PDF binary, so this component isn't used there
 *  — see Parse.tsx). */
export function PdfPageViewer({ file, pageNumber }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    loadDocument(file)
      .then((pdf) => pdf.getPage(pageNumber))
      .then((page) => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const viewport = page.getViewport({ scale: 1.4 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context unavailable");
        return page.render({ canvasContext: ctx, viewport }).promise;
      })
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [file, pageNumber]);

  if (status === "error") {
    return (
      <div className="rounded-md border border-dashed border-border-strong bg-bg-elevated p-3 text-[11.5px] text-text-dim">
        Couldn't render page {pageNumber} of the original PDF.
      </div>
    );
  }

  return (
    <div className="relative">
      {status === "loading" && (
        <div className="flex h-40 items-center justify-center text-[11.5px] text-text-dim">Rendering page {pageNumber}…</div>
      )}
      <canvas ref={canvasRef} className={`w-full rounded-md border border-border-soft shadow-card ${status === "ready" ? "block" : "hidden"}`} />
    </div>
  );
}
