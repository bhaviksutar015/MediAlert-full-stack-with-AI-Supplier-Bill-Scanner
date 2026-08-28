const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Service to extract structured medicine and invoice data from text or visual documents using Gemini AI.
 */
class AiExtractionService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  /**
   * Helper to ensure Gemini client instance is ready.
   */
  _ensureClient() {
    if (!this.genAI) {
      this.apiKey = process.env.GEMINI_API_KEY;
      this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    }
    if (!this.genAI) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
  }

  /**
   * Extract structured medicines from page text.
   * @param {string} pageText - Raw or OCR-transcribed text of the invoice page.
   * @param {number} pageNumber - Page number.
   * @returns {Promise<{ invoice: Object, medicines: Array }>}
   */
  async extractFromPageText(pageText, pageNumber = 1) {
    this._ensureClient();

    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1, // low temperature for precise, deterministic extraction
      },
    });

    const prompt = `
You are a specialized pharmaceutical invoice parser AI.
Analyze the following text extracted from page ${pageNumber} of a supplier medicine bill / invoice.

### COLUMN ALIAS MAPPING GUIDELINES:
- Medicine Name: Matches "Product Name", "Item Description", "Description", "Medicine Name", "Drug Name", "Particulars", "Item", "Brand".
- Batch Number: Matches "Batch No", "Batch Number", "B.No", "Batch", "Lot No", "Lot", "LOT/BATCH".
- Manufacturing Date: Matches "MFG", "MFD", "Mfg Date", "Mfg. Date", "Manufacturing Date", "DOM". Format as YYYY-MM or YYYY-MM-DD if found, otherwise null.
- Expiry Date: Matches "EXP", "EXPIRY", "Exp. Date", "Expiry Date", "Exp Date", "EXP DT". Format as YYYY-MM or YYYY-MM-DD if found, otherwise null.
- Quantity: Matches "Qty", "Quantity", "Units", "Pcs", "Nos", "Billed Qty", "Total Qty". Must be a positive number.
- Unit Type: Matches "Unit", "Pack", "Type", "Form", e.g., "Tablets", "Strips", "Bottles", "Boxes", "Vials", "Ampoules", "Tubes", "Packs", "Units".
- Price / Rate: Matches "Rate", "Price", "Unit Price", "PTS", "PTR", "MRP", "Rate/Unit". Must be a numeric value or null.
- Amount: Matches "Amount", "Total Amount", "Net Amount", "Total Value". Must be a numeric value or null.
- Category: Infer standard pharmaceutical category (e.g. "Antibiotics", "Analgesics / Pain Relief", "Antipyretic / Fever", "Cardiovascular", "Antidiabetic", "Syrups & Suspensions", "Dermatological / Ointments", "Vitamins & Supplements", "Ophthalmic / Eye Drops", "Emergency Care", "General").

### STRICT RULES:
1. NEVER invent, guess, or hallucinate information. If a field (e.g., batch number, expiry date, manufacturing date) is not in the text, return null.
2. Only return actual medicine/pharmaceutical/surgical line items. Exclude footer totals, tax summaries (GST/CGST/SGST lines), bank details, or delivery charges from the medicine list.
3. Assign a "confidence" score between 0.0 and 1.0 based on how clearly and completely the medicine name, batch number, and expiry date were identified.
4. If this page contains invoice metadata (Supplier Name, Invoice Number, Invoice Date, Total Invoice Amount), extract it into the "invoice" object. If not present on this page, return null for those invoice fields.

### OUTPUT JSON SCHEMA:
{
  "invoice": {
    "supplierName": string | null,
    "invoiceNumber": string | null,
    "invoiceDate": string | null,
    "totalInvoiceAmount": number | null
  },
  "medicines": [
    {
      "medicineName": string (REQUIRED, e.g. "Augmentin 625 Duo Tab"),
      "brandName": string | null,
      "genericName": string | null,
      "category": string,
      "batchNumber": string | null,
      "manufacturingDate": string | null,
      "expiryDate": string | null,
      "quantity": number,
      "unitType": string | null,
      "unitPrice": number | null,
      "totalAmount": number | null,
      "confidence": number (0.0 to 1.0),
      "sourcePage": ${pageNumber}
    }
  ]
}

Page ${pageNumber} Text Content:
"""
${pageText}
"""
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);

      return {
        invoice: parsed.invoice || null,
        medicines: Array.isArray(parsed.medicines)
          ? parsed.medicines.map((m) => ({
              ...m,
              sourcePage: pageNumber,
              quantity: typeof m.quantity === "number" && m.quantity > 0 ? m.quantity : 1,
              confidence: typeof m.confidence === "number" ? m.confidence : 0.85,
            }))
          : [],
      };
    } catch (err) {
      console.error(`AI Extraction failed for text on page ${pageNumber}:`, err.message);
      throw new Error(`AI Extraction failed on page ${pageNumber}: ${err.message}`);
    }
  }

  /**
   * Extract structured medicines directly from a visual single-page PDF or image buffer.
   * @param {Buffer} buffer - Single page PDF or image buffer.
   * @param {string} mimeType - e.g. "application/pdf", "image/png"
   * @param {number} pageNumber - Page number.
   * @returns {Promise<{ invoice: Object, medicines: Array }>}
   */
  async extractFromVisualPage(buffer, mimeType = "application/pdf", pageNumber = 1) {
    this._ensureClient();

    const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const model = this.genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const inlinePart = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: mimeType,
      },
    };

    const prompt = `
You are a specialized pharmaceutical invoice parser AI analyzing Page ${pageNumber} of a supplier medicine bill.
Extract all medicine line items and invoice metadata with high precision directly from this visual document.

### COLUMN ALIAS MAPPING GUIDELINES:
- Medicine Name: Matches "Product Name", "Item Description", "Description", "Medicine Name", "Drug Name", "Particulars", "Brand".
- Batch Number: Matches "Batch No", "Batch Number", "B.No", "Batch", "Lot No", "Lot", "LOT/BATCH".
- Manufacturing Date: Matches "MFG", "MFD", "Mfg Date", "Mfg. Date", "Manufacturing Date", "DOM". Format as YYYY-MM or YYYY-MM-DD if found, otherwise null.
- Expiry Date: Matches "EXP", "EXPIRY", "Exp. Date", "Expiry Date", "Exp Date", "EXP DT". Format as YYYY-MM or YYYY-MM-DD if found, otherwise null.
- Quantity: Matches "Qty", "Quantity", "Units", "Pcs", "Nos", "Billed Qty", "Total Qty". Must be a positive number.
- Unit Type: Matches "Unit", "Pack", "Type", "Form", e.g., "Tablets", "Strips", "Bottles", "Boxes", "Vials", "Packs", "Units".
- Price / Rate: Matches "Rate", "Price", "Unit Price", "PTS", "PTR", "MRP". Must be a numeric value or null.
- Amount: Matches "Amount", "Total Amount", "Net Amount". Must be a numeric value or null.
- Category: Infer standard pharmaceutical category (e.g. "Antibiotics", "Analgesics / Pain Relief", "Antipyretic / Fever", "Cardiovascular", "Antidiabetic", "Syrups & Suspensions", "Dermatological / Ointments", "Vitamins & Supplements", "Ophthalmic / Eye Drops", "Emergency Care", "General").

### STRICT RULES:
1. NEVER invent, guess, or hallucinate information. If a field is not visible in the document, return null.
2. Exclude non-medicine lines like GST summary, taxes, transport charges, terms & conditions.
3. Assign a "confidence" score between 0.0 and 1.0 based on image clarity and data completeness.
4. Extract invoice metadata if present on this page (Supplier Name, Invoice Number, Invoice Date, Total Invoice Amount).

### OUTPUT JSON SCHEMA:
{
  "invoice": {
    "supplierName": string | null,
    "invoiceNumber": string | null,
    "invoiceDate": string | null,
    "totalInvoiceAmount": number | null
  },
  "medicines": [
    {
      "medicineName": string (REQUIRED),
      "brandName": string | null,
      "genericName": string | null,
      "category": string,
      "batchNumber": string | null,
      "manufacturingDate": string | null,
      "expiryDate": string | null,
      "quantity": number,
      "unitType": string | null,
      "unitPrice": number | null,
      "totalAmount": number | null,
      "confidence": number (0.0 to 1.0),
      "sourcePage": ${pageNumber}
    }
  ]
}
`;

    try {
      const result = await model.generateContent([prompt, inlinePart]);
      const response = await result.response;
      const text = response.text();
      const parsed = JSON.parse(text);

      return {
        invoice: parsed.invoice || null,
        medicines: Array.isArray(parsed.medicines)
          ? parsed.medicines.map((m) => ({
              ...m,
              sourcePage: pageNumber,
              quantity: typeof m.quantity === "number" && m.quantity > 0 ? m.quantity : 1,
              confidence: typeof m.confidence === "number" ? m.confidence : 0.85,
            }))
          : [],
      };
    } catch (err) {
      console.error(`AI Extraction failed for visual page ${pageNumber}:`, err.message);
      throw new Error(`AI Extraction failed on visual page ${pageNumber}: ${err.message}`);
    }
  }
}

module.exports = new AiExtractionService();
