const express = require("express");

const {
  addMedicine,
  addMedicinesBatch,
  getMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
  getExpiredMedicines,
  getExpiringMedicines,
  getLowStockMedicines,
} = require("../controllers/medicineController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All medicine routes require authentication
router.use(protect);

// Specific routes first to prevent :id param conflict
router.post("/batch", addMedicinesBatch);
router.get("/expired", getExpiredMedicines);
router.get("/expiring", getExpiringMedicines);
router.get("/low-stock", getLowStockMedicines);

// Base CRUD routes
router.post("/", addMedicine);
router.get("/", getMedicines);
router.get("/:id", getMedicineById);
router.put("/:id", updateMedicine);
router.delete("/:id", deleteMedicine);

module.exports = router;