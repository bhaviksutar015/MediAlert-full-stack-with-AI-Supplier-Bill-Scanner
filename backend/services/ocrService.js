const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Service to perform OCR and vision-based extraction on scanned PDF pages or images.
 */
class OcrService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  /**
   * Perform visual OCR extraction on a single-page PDF buffer or image buffer using Gemini Multimodal.
   * @param {Buffer} buffer - Buffer containing the single-page PDF or image.
   * @param {string} mimeType - e.g. "application/pdf", "image/png", "image/jpeg"
   * @param {number} pageNumber - Page number for tracking.
   * @returns {Promise<string>} Extracted text/table data from the document.
   */
  async extractTextFromVisualBuffer(buffer, mimeType = "application/pdf", pageNumber = 1) {
    if (!this.genAI) {
      this.apiKey = process.env.GEMINI_API_KEY;
      this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    }

    if (!this.genAI) {
      throw new Error("GEMINI_API_KEY environment variable is not configured for OCR service.");
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const model = this.genAI.getGenerativeModel({
      model: modelName,
    });

    const inlinePart = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: mimeType,
      },
    };

    const ocrPrompt = `
      You are an expert OCR transcription engine for pharmaceutical supplier invoices and bills.
      Carefully transcribe all readable text, tabular columns, invoice headers, and medicine rows from this page (Page ${pageNumber}).
      
      Instructions:
      - Preserve table headers and row structures (Product / Item, Batch, Expiry, Qty, Rate, Amount).
      - Transcribe supplier header, invoice number, invoice date if present.
      - Transcribe accurately without guessing or hallucinating numbers or dates.
      - Return the transcribed text directly in a clean markdown/tabular text format.
    `;

    try {
      const result = await model.generateContent([ocrPrompt, inlinePart]);
      const response = await result.response;
      return response.text();
    } catch (err) {
      console.error(`OCR processing error on page ${pageNumber}:`, err.message);
      throw new Error(`OCR processing failed on page ${pageNumber}: ${err.message}`);
    }
  }
}

module.exports = new OcrService();
