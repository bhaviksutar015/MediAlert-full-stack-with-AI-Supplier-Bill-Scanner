const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/authMiddleware");
const {
  scanInvoice,
  checkDuplicates,
  importMedicines,
} = require("../controllers/invoiceController");

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration for temporary invoice uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `invoice-${uniqueSuffix}${path.extname(file.originalname || ".pdf")}`);
  },
});

// File filter: accept only PDF documents
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/pdf" ||
    file.originalname.toLowerCase().endsWith(".pdf")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF invoices are allowed (.pdf)"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
  fileFilter,
});

// All invoice routes require authentication
router.use(protect);

// 1. Scan PDF invoice endpoint
router.post("/scan", upload.single("file"), scanInvoice);

// 2. Check for duplicate medicines against current inventory
router.post("/check-duplicates", checkDuplicates);

// 3. Batch import reviewed medicines into inventory
router.post("/import", importMedicines);

module.exports = router;
