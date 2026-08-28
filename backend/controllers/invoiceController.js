const fs = require("fs");
const path = require("path");
const Medicine = require("../models/Medicine");
const invoiceScannerService = require("../services/invoiceScannerService");

// Helper to enforce user isolation for queries
const getUserQuery = (req) => {
  const userId = req.user._id;
  return {
    $or: [{ userId: userId }, { createdBy: userId }],
  };
};

// Helper to safely parse and normalize expiry dates
const parseExpiryDate = (dateStr) => {
  if (!dateStr) return null;
  const str = String(dateStr).trim();

  // If format is MM/YY or MM/YYYY (e.g. 05/26 or 05/2026)
  if (/^\d{1,2}\/\d{2,4}$/.test(str)) {
    const [month, year] = str.split("/");
    const fullYear = year.length === 2 ? `20${year}` : year;
    const padMonth = month.padStart(2, "0");
    const d = new Date(Number(fullYear), Number(padMonth), 0); // last day of that month
    return isNaN(d.getTime()) ? null : d;
  }

  // If format is YYYY-MM (e.g. 2027-09)
  if (/^\d{4}-\d{1,2}$/.test(str)) {
    const [year, month] = str.split("-");
    const d = new Date(Number(year), Number(month), 0); // last day of that month
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * @desc Scan a supplier bill PDF and extract medicine items and invoice details
 * @route POST /api/invoices/scan
 * @access Private
 */
const scanInvoice = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error("No PDF invoice file uploaded. Please select a PDF file.");
    }

    const filePath = req.file.path;
    const isPdf =
      req.file.mimetype === "application/pdf" ||
      req.file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.status(400);
      throw new Error("Invalid file type. Only PDF invoices (.pdf) are supported.");
    }

    let scanResult;
    try {
      scanResult = await invoiceScannerService.scanInvoice(filePath);
    } finally {
      // Secure cleanup: Ensure temporary upload file is deleted immediately
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (cleanupErr) {
          console.warn("Failed to delete temp file:", cleanupErr.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Scanned ${scanResult.processedPagesCount} pages successfully. Found ${scanResult.totalExtracted} medicines.`,
      ...scanResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Check for duplicate medicines in the user's inventory
 * @route POST /api/invoices/check-duplicates
 * @access Private
 */
const checkDuplicates = async (req, res, next) => {
  try {
    const { medicines } = req.body;
    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(200).json({ success: true, duplicates: [] });
    }

    const userQuery = getUserQuery(req);
    const existingMedicines = await Medicine.find(userQuery).select(
      "name genericName batchNumber quantity price expiryDate category manufacturer"
    );

    const duplicates = [];

    for (const item of medicines) {
      if (!item.medicineName) continue;

      const cleanItemName = item.medicineName.trim().toLowerCase();
      const cleanItemBatch = item.batchNumber ? item.batchNumber.trim().toLowerCase() : null;

      // Find exact match (same name + same batch number)
      const exactMatch = existingMedicines.find((em) => {
        const emName = (em.name || "").trim().toLowerCase();
        const emBatch = (em.batchNumber || "").trim().toLowerCase();
        return (
          emName === cleanItemName &&
          cleanItemBatch &&
          emBatch === cleanItemBatch
        );
      });

      if (exactMatch) {
        duplicates.push({
          tempId: item.tempId,
          medicineName: item.medicineName,
          batchNumber: item.batchNumber,
          matchType: "exact",
          existingMedicine: exactMatch,
        });
        continue;
      }

      // Find name-only match (same name, different or missing batch number)
      const nameMatch = existingMedicines.find((em) => {
        const emName = (em.name || "").trim().toLowerCase();
        return emName === cleanItemName;
      });

      if (nameMatch) {
        duplicates.push({
          tempId: item.tempId,
          medicineName: item.medicineName,
          batchNumber: item.batchNumber,
          matchType: "name_only",
          existingMedicine: nameMatch,
        });
      }
    }

    res.status(200).json({
      success: true,
      count: duplicates.length,
      duplicates,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Import reviewed medicines into user's inventory with duplicate resolution
 * @route POST /api/invoices/import
 * @access Private
 */
const importMedicines = async (req, res, next) => {
  try {
    const { medicines, duplicateResolutions = {}, invoiceMetadata = {} } = req.body;

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      res.status(400);
      throw new Error("No medicines provided for inventory import.");
    }

    const userQuery = getUserQuery(req);
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const createdMedicines = [];

    for (let i = 0; i < medicines.length; i++) {
      const item = medicines[i];
      const tempId = item.tempId || `item_${i}`;
      const resolution = duplicateResolutions[tempId] || "create_new";

      // 1. Skip if requested
      if (resolution === "skip") {
        skippedCount++;
        continue;
      }

      // 2. Validate essential fields
      const medName = (item.medicineName || item.name || "").trim();
      if (!medName) {
        errors.push({ item: medName || `Item #${i + 1}`, error: "Medicine name is required." });
        continue;
      }

      const qty = Number(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        errors.push({ item: medName, error: "Valid positive quantity is required." });
        continue;
      }

      const parsedExp = parseExpiryDate(item.expiryDate);
      if (!parsedExp) {
        errors.push({ item: medName, error: "Valid expiry date is required (e.g. YYYY-MM-DD or YYYY-MM)." });
        continue;
      }

      const purchaseDate = item.manufacturingDate
        ? parseExpiryDate(item.manufacturingDate) || new Date()
        : invoiceMetadata.invoiceDate
        ? parseExpiryDate(invoiceMetadata.invoiceDate) || new Date()
        : new Date();

      const unitPrice =
        item.unitPrice !== null && item.unitPrice !== undefined && !isNaN(Number(item.unitPrice))
          ? Number(item.unitPrice)
          : item.price !== undefined && !isNaN(Number(item.price))
          ? Number(item.price)
          : 0;

      const manufacturer =
        item.manufacturer ||
        item.brandName ||
        invoiceMetadata.supplierName ||
        "";

      const description = [
        item.unitType ? `Unit Form: ${item.unitType}` : "",
        invoiceMetadata.invoiceNumber ? `Invoice: ${invoiceMetadata.invoiceNumber}` : "",
        invoiceMetadata.supplierName ? `Supplier: ${invoiceMetadata.supplierName}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      // 3. Handle 'add_quantity' resolution
      if (resolution === "add_quantity") {
        const existing = await Medicine.findOne({
          ...userQuery,
          name: new RegExp(`^${medName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
          ...(item.batchNumber ? { batchNumber: item.batchNumber.trim() } : {}),
        });

        if (existing) {
          existing.quantity = (existing.quantity || 0) + qty;
          if (unitPrice > 0 && (!existing.price || existing.price === 0)) {
            existing.price = unitPrice;
          }
          await existing.save();
          updatedCount++;
          continue;
        }
      }

      // 4. Handle 'update' resolution
      if (resolution === "update") {
        const existing = await Medicine.findOne({
          ...userQuery,
          name: new RegExp(`^${medName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        });

        if (existing) {
          existing.quantity = (existing.quantity || 0) + qty;
          existing.expiryDate = parsedExp;
          if (item.batchNumber) existing.batchNumber = item.batchNumber.trim();
          if (item.genericName) existing.genericName = item.genericName.trim();
          if (unitPrice > 0) existing.price = unitPrice;
          if (manufacturer) existing.manufacturer = manufacturer;
          if (item.category) existing.category = item.category;
          await existing.save();
          updatedCount++;
          continue;
        }
      }

      // 5. Default: Create new Medicine document
      try {
        const newMed = await Medicine.create({
          name: medName,
          genericName: (item.genericName || "").trim(),
          category: (item.category || "General").trim(),
          batchNumber: (item.batchNumber || "").trim(),
          manufacturer: manufacturer.trim(),
          quantity: qty,
          minimumStock: 10,
          expiryDate: parsedExp,
          purchaseDate: purchaseDate,
          price: unitPrice,
          description: description,
          userId: req.user._id,
          createdBy: req.user._id,
        });

        createdMedicines.push(newMed);
        importedCount++;
      } catch (insertErr) {
        errors.push({ item: medName, error: insertErr.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `Import completed: ${importedCount} added as new, ${updatedCount} updated, ${skippedCount} skipped.`,
      importedCount,
      updatedCount,
      skippedCount,
      errorsCount: errors.length,
      errors,
      medicines: createdMedicines,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanInvoice,
  checkDuplicates,
  importMedicines,
};
