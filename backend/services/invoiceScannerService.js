const pdfProcessorService = require("./pdfProcessorService");
const aiExtractionService = require("./aiExtractionService");
const ocrService = require("./ocrService");

/**
 * Service to orchestrate end-to-end multi-page supplier invoice scanning and data extraction.
 */
class InvoiceScannerService {
  /**
   * Process a supplier bill PDF and extract all medicine items across all pages.
   * @param {string} filePath - Absolute path to the uploaded PDF file.
   * @param {Function} [onProgress] - Optional callback for reporting step-by-step page progress.
   * @returns {Promise<Object>} Structured scan result containing invoice metadata, medicines, and stats.
   */
  async scanInvoice(filePath, onProgress = null) {
    // 1. Validate PDF file
    const validation = await pdfProcessorService.validatePdf(filePath);
    const { totalPages, fileSize } = validation;

    // 2. Extract per-page text and standalone page buffers
    const pagesData = await pdfProcessorService.extractPagesData(filePath);

    let mergedInvoice = {
      supplierName: null,
      invoiceNumber: null,
      invoiceDate: null,
      totalInvoiceAmount: null,
    };

    const allMedicines = [];
    const failedPages = [];
    let medicineCounter = 0;

    // 3. Process each page with resilient error handling
    for (let i = 0; i < pagesData.length; i++) {
      const page = pagesData[i];
      const pageNumber = page.pageNumber;

      if (onProgress) {
        onProgress({
          currentPage: pageNumber,
          totalPages: totalPages,
          message: `Processing page ${pageNumber} of ${totalPages}...`,
        });
      }

      try {
        let pageResult = null;

        // Strategy A: If page has sufficient text content (> 50 chars), use text-based AI extraction
        if (!page.isScanned && page.text && page.text.trim().length >= 50) {
          try {
            pageResult = await aiExtractionService.extractFromPageText(page.text, pageNumber);
          } catch (textExtractErr) {
            console.warn(`Text extraction fallback to visual for page ${pageNumber}:`, textExtractErr.message);
            // Fallback to visual page if text extraction fails
            if (page.pageBuffer) {
              pageResult = await aiExtractionService.extractFromVisualPage(page.pageBuffer, "application/pdf", pageNumber);
            } else {
              throw textExtractErr;
            }
          }
        } else if (page.pageBuffer) {
          // Strategy B: Page is scanned or image-based, use visual Gemini extraction
          try {
            pageResult = await aiExtractionService.extractFromVisualPage(page.pageBuffer, "application/pdf", pageNumber);
          } catch (visualErr) {
            console.warn(`Visual extraction fallback to OCR for page ${pageNumber}:`, visualErr.message);
            // Fallback: Use OCR service to transcribe text first, then extract
            const ocrText = await ocrService.extractTextFromVisualBuffer(page.pageBuffer, "application/pdf", pageNumber);
            if (ocrText && ocrText.trim().length > 0) {
              pageResult = await aiExtractionService.extractFromPageText(ocrText, pageNumber);
            } else {
              throw new Error("OCR could not detect readable content on this page.");
            }
          }
        } else {
          throw new Error("Unable to read or render page content.");
        }

        // Merge invoice metadata from the earliest page that contains it
        if (pageResult && pageResult.invoice) {
          if (!mergedInvoice.supplierName && pageResult.invoice.supplierName) {
            mergedInvoice.supplierName = pageResult.invoice.supplierName;
          }
          if (!mergedInvoice.invoiceNumber && pageResult.invoice.invoiceNumber) {
            mergedInvoice.invoiceNumber = pageResult.invoice.invoiceNumber;
          }
          if (!mergedInvoice.invoiceDate && pageResult.invoice.invoiceDate) {
            mergedInvoice.invoiceDate = pageResult.invoice.invoiceDate;
          }
          if (!mergedInvoice.totalInvoiceAmount && pageResult.invoice.totalInvoiceAmount) {
            mergedInvoice.totalInvoiceAmount = pageResult.invoice.totalInvoiceAmount;
          }
        }

        // Merge medicine line items with temporary client IDs for easy frontend editing
        if (pageResult && Array.isArray(pageResult.medicines)) {
          for (const item of pageResult.medicines) {
            if (!item.medicineName || !item.medicineName.trim()) continue;

            medicineCounter++;
            allMedicines.push({
              tempId: `item_${pageNumber}_${medicineCounter}_${Date.now()}`,
              medicineName: item.medicineName.trim(),
              brandName: item.brandName ? item.brandName.trim() : null,
              genericName: item.genericName ? item.genericName.trim() : null,
              category: item.category || "General",
              batchNumber: item.batchNumber ? item.batchNumber.trim() : null,
              manufacturingDate: item.manufacturingDate || null,
              expiryDate: item.expiryDate || null,
              quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
              unitType: item.unitType || "Units",
              unitPrice: item.unitPrice !== null && item.unitPrice !== undefined ? Number(item.unitPrice) : null,
              totalAmount: item.totalAmount !== null && item.totalAmount !== undefined ? Number(item.totalAmount) : null,
              confidence: typeof item.confidence === "number" ? Math.min(1, Math.max(0, item.confidence)) : 0.85,
              sourcePage: pageNumber,
              selected: true, // selected by default for import
            });
          }
        }
      } catch (pageErr) {
        console.error(`Error scanning page ${pageNumber}:`, pageErr.message);
        failedPages.push({
          page: pageNumber,
          error: pageErr.message || "Failed to extract readable medicine data.",
        });
      }
    }

    return {
      success: true,
      fileInfo: {
        totalPages,
        fileSizeBytes: fileSize,
      },
      invoice: mergedInvoice,
      medicines: allMedicines,
      totalExtracted: allMedicines.length,
      failedPages,
      processedPagesCount: totalPages - failedPages.length,
    };
  }
}

module.exports = new InvoiceScannerService();
