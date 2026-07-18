import { describe, it, expect } from 'vitest';
import { validatePdfFile, PdfError, PDF_LIMITS } from './pdfValidation';

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

function makeFile(bytes: number[], name = 'report.pdf'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });
}

describe('validatePdfFile', () => {
  it('accepts a file with a valid %PDF- header', async () => {
    const file = makeFile([...PDF_MAGIC, 0x31, 0x2e, 0x34]); // %PDF-1.4
    await expect(validatePdfFile(file)).resolves.toBeUndefined();
  });

  it('rejects a file whose bytes are not a PDF', async () => {
    const file = makeFile([0x50, 0x4b, 0x03, 0x04, 0x00], 'notReallyA.pdf'); // a zip
    await expect(validatePdfFile(file)).rejects.toBeInstanceOf(PdfError);
    await expect(validatePdfFile(file)).rejects.toMatchObject({ code: 'INVALID_TYPE' });
  });

  it('rejects a file that only looks like a PDF by extension', async () => {
    const file = makeFile([0x25, 0x50, 0x44, 0x00, 0x00]); // %PD.. — not %PDF-
    await expect(validatePdfFile(file)).rejects.toMatchObject({ code: 'INVALID_TYPE' });
  });

  it('rejects a file larger than the size limit before reading bytes', async () => {
    // Fake an oversized File so we don't allocate 20MB in the test. The size
    // check runs before the byte read, so slice() is never called.
    const huge = { size: PDF_LIMITS.MAX_BYTES + 1 } as unknown as File;
    await expect(validatePdfFile(huge)).rejects.toMatchObject({ code: 'TOO_LARGE' });
  });

  it('PdfError carries a machine-readable code and a message', () => {
    const err = new PdfError('ENCRYPTED', 'locked');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('ENCRYPTED');
    expect(err.message).toBe('locked');
  });
});
