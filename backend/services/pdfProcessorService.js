const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const { PDFParse } = require("pdf-parse");

/**
 * Service to validate, inspect, and extract pages and text from PDF files.
 */
class PdfProcessorService {
  /**
   * Validate a PDF file on disk.
   * @param {string} filePath - Absolute path to the PDF file.
   * @param {number} maxSizeBytes - Maximum allowed file size in bytes (default 25MB).
   * @returns {Promise<{ isValid: boolean, totalPages: number, fileSize: number }>}
   */
  async validatePdf(filePath, maxSizeBytes = 25 * 1024 * 1024) {
    if (!fs.existsSync(filePath)) {
      throw new Error("Uploaded file not found on server.");
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      throw new Error("The uploaded PDF file is empty (0 bytes).");
    }

    if (stats.size > maxSizeBytes) {
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      throw new Error(`File size (${sizeMB} MB) exceeds maximum allowed limit of ${maxSizeBytes / (1024 * 1024)} MB.`);
    }

    // Check header for %PDF magic bytes
    const buffer = fs.readFileSync(filePath);
    const header = buffer.subarray(0, 5).toString("ascii");
    if (!header.startsWith("%PDF")) {
      throw new Error("Invalid file format: File is not a valid PDF document.");
    }

    // Attempt to load with pdf-lib to check corruption or password protection
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      const totalPages = pdfDoc.getPageCount();

      if (totalPages === 0) {
        throw new Error("PDF document contains 0 pages.");
      }

      return {
        isValid: true,
        totalPages,
        fileSize: stats.size,
      };
    } catch (err) {
      if (err.message && (err.message.toLowerCase().includes("encrypt") || err.message.toLowerCase().includes("password"))) {
        throw new Error("Password-protected PDFs are not supported. Please remove the password and try again.");
      }
      throw new Error(`Corrupted or unreadable PDF: ${err.message}`);
    }
  }

  /**
   * Extract text and metadata from all pages of a PDF.
   * @param {string} filePath - Absolute path to the PDF file.
   * @returns {Promise<Array<{ pageNumber: number, text: string, charCount: number, isScanned: boolean, pageBuffer: Buffer }>>}
   */
  async extractPagesData(filePath) {
    const buffer = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    // 1. Extract per-page text using PDFParse
    const pageTexts = new Map();
    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();

      if (textResult && Array.isArray(textResult.pages)) {
        textResult.pages.forEach((pageObj) => {
          if (pageObj && pageObj.num) {
            pageTexts.set(pageObj.num, (pageObj.text || "").trim());
          }
        });
      }
    } catch (parseErr) {
      console.warn("PDFParse per-page extraction warning:", parseErr.message);
    }

    // 2. Build page-by-page data with standalone single-page PDF buffers for OCR/vision fallback
    const pagesData = [];

    for (let i = 0; i < totalPages; i++) {
      const pageNumber = i + 1;
      const text = pageTexts.get(pageNumber) || "";
      const charCount = text.replace(/\s+/g, "").length;

      // A page is considered "scanned / image-only" if text character count is very low (< 50 chars)
      const isScanned = charCount < 50;

      // Create a standalone single-page PDF buffer
      let singlePageBuffer = null;
      try {
        const subDoc = await PDFDocument.create();
        const [copiedPage] = await subDoc.copyPages(pdfDoc, [i]);
        subDoc.addPage(copiedPage);
        const singlePageBytes = await subDoc.save();
        singlePageBuffer = Buffer.from(singlePageBytes);
      } catch (subDocErr) {
        console.warn(`Could not create single-page buffer for page ${pageNumber}:`, subDocErr.message);
      }

      pagesData.push({
        pageNumber,
        text,
        charCount,
        isScanned,
        pageBuffer: singlePageBuffer,
      });
    }

    return pagesData;
  }
}

module.exports = new PdfProcessorService();
