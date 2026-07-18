import * as pdfjsLib from 'pdfjs-dist';
import { PDF_LIMITS, PdfError, validatePdfFile } from './pdfValidation';

export { PDF_LIMITS, PdfError, validatePdfFile } from './pdfValidation';
export type { PdfErrorCode } from './pdfValidation';

// pdf.js runs its parser in a Web Worker. Vite bundles the worker from this
// URL and hands back an asset path. Setting it at module load is fine because
// callers dynamically import() this module, so pdf.js only reaches the browser
// when the user actually picks a PDF (keeping it out of the initial bundle).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface PdfExtractionProgress {
  page: number;
  totalPages: number;
}

export interface PdfExtractionResult {
  text: string;
  numPages: number;
}

export interface PdfPageImage {
  base64Data: string;
  mediaType: string;
}

// pdf.js operator codes that mean "this page paints a raster image".
function pageHasRasterImage(fnArray: number[]): boolean {
  const ops = pdfjsLib.OPS;
  return fnArray.some(
    (fn) =>
      fn === ops.paintImageXObject ||
      fn === ops.paintInlineImage ||
      fn === ops.paintImageMaskXObject
  );
}

/**
 * Render the first pages that actually contain raster images (diagrams,
 * screenshots) to JPEGs, for diagram vision analysis. Text-only pages are
 * skipped, so a plain text report produces no images and triggers no vision
 * call. Returns base64 JPEGs sized to stay well within request/image limits.
 */
export async function renderPdfImagePages(
  file: File,
  maxImages = 3
): Promise<PdfPageImage[]> {
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const images: PdfPageImage[] = [];

  try {
    for (
      let pageNum = 1;
      pageNum <= pdf.numPages && images.length < maxImages;
      pageNum++
    ) {
      const page = await pdf.getPage(pageNum);
      try {
        const opList = await page.getOperatorList();
        if (!pageHasRasterImage(opList.fnArray)) continue;

        // Cap the long edge so the encoded image stays small.
        const baseViewport = page.getViewport({ scale: 1 });
        const maxEdge = 1400;
        const scale = Math.min(1.5, maxEdge / Math.max(baseViewport.width, baseViewport.height));
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const canvasContext = canvas.getContext('2d');
        if (!canvasContext) continue;

        await page.render({ canvas, canvasContext, viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        images.push({ base64Data: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
      } finally {
        page.cleanup();
      }
    }
    return images;
  } finally {
    await loadingTask.destroy();
  }
}

/**
 * Extract the text layer from a PDF entirely in the browser. Throws a PdfError
 * with a user-facing message for the expected failure modes (not a PDF,
 * too large/long, encrypted, corrupt, or no selectable text).
 */
export async function extractPdfText(
  file: File,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<PdfExtractionResult> {
  await validatePdfFile(file);

  const data = new Uint8Array(await file.arrayBuffer());

  // getDocument returns a loading task; the document is released by destroying
  // the task (the document proxy itself has no destroy() in pdf.js v6).
  const loadingTask = pdfjsLib.getDocument({ data });
  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    pdf = await loadingTask.promise;
  } catch (err) {
    if (err && (err as { name?: string }).name === 'PasswordException') {
      throw new PdfError('ENCRYPTED', 'This PDF is password-protected and cannot be read.');
    }
    throw new PdfError('CORRUPT', 'Could not read this PDF. It may be corrupt.');
  }

  try {
    if (pdf.numPages > PDF_LIMITS.MAX_PAGES) {
      throw new PdfError(
        'TOO_MANY_PAGES',
        `PDF has ${pdf.numPages} pages. Maximum is ${PDF_LIMITS.MAX_PAGES}.`
      );
    }

    const parts: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      parts.push(pageText);
      page.cleanup();
      onProgress?.({ page: pageNum, totalPages: pdf.numPages });
    }

    const text = parts.join('\n\n').replace(/[ \t]+\n/g, '\n').trim();

    if (text.replace(/\s/g, '').length < PDF_LIMITS.MIN_TEXT_CHARS) {
      throw new PdfError(
        'NO_TEXT',
        'No selectable text found. This looks like a scanned or image-only PDF.'
      );
    }

    return { text, numPages: pdf.numPages };
  } finally {
    await loadingTask.destroy();
  }
}
