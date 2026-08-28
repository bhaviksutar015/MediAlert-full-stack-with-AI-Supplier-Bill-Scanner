const express = require("express");
const router = express.Router();
const multer = require("multer");
const { extractMedicineDetails } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// Configure multer to temporarily save uploaded files in an 'uploads' folder
const upload = multer({ dest: 'uploads/' });

// Create the POST route with authentication protection
router.post("/extract", protect, upload.single("image"), extractMedicineDetails);

module.exports = router;