// Pure PDF validation — no pdf.js dependency, so it stays cheap to import and test.

export const PDF_LIMITS = {
  MAX_BYTES: 20 * 1024 * 1024, // 20MB
  MAX_PAGES: 100,
  // Below this many non-whitespace chars we treat the PDF as having no usable
  // text layer (e.g. a scanned/image-only report).
  MIN_TEXT_CHARS: 20,
} as const;

export type PdfErrorCode =
  | 'INVALID_TYPE'
  | 'TOO_LARGE'
  | 'TOO_MANY_PAGES'
  | 'ENCRYPTED'
  | 'CORRUPT'
  | 'NO_TEXT';

export class PdfError extends Error {
  code: PdfErrorCode;
  constructor(code: PdfErrorCode, message: string) {
    super(message);
    this.name = 'PdfError';
    this.code = code;
  }
}

// PDF files start with the magic bytes "%PDF-". Checking the bytes (not just
// the extension) avoids feeding a mislabelled/hostile file to the parser.
async function assertPdfMagicBytes(file: Blob): Promise<void> {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf =
    header[0] === 0x25 && // %
    header[1] === 0x50 && // P
    header[2] === 0x44 && // D
    header[3] === 0x46 && // F
    header[4] === 0x2d; //   -
  if (!isPdf) {
    throw new PdfError('INVALID_TYPE', 'That file is not a valid PDF.');
  }
}

export async function validatePdfFile(file: File): Promise<void> {
  if (file.size > PDF_LIMITS.MAX_BYTES) {
    const mb = (PDF_LIMITS.MAX_BYTES / (1024 * 1024)).toFixed(0);
    throw new PdfError('TOO_LARGE', `PDF is too large. Maximum size is ${mb}MB.`);
  }
  await assertPdfMagicBytes(file);
}
