const Medicine = require("../models/Medicine");
const {
  getExpiryStatus,
  getDaysUntilExpiry,
  isLowStock,
} = require("../utils/expiryChecker");

// Helper to enforce user isolation for queries (compatible with both userId and createdBy)
const getUserQuery = (req) => {
  const userId = req.user._id;
  return {
    $or: [
      { userId: userId },
      { createdBy: userId },
    ],
  };
};

// @desc Add a new medicine
const addMedicine = async (req, res, next) => {
  try {
    const {
      name,
      genericName,
      category,
      batchNumber,
      manufacturer,
      quantity,
      minimumStock,
      expiryDate,
      purchaseDate,
      price,
      description,
    } = req.body;

    if (!name || quantity === undefined || !expiryDate) {
      res.status(400);
      throw new Error("Name, quantity and expiry date are required");
    }

    const medicine = await Medicine.create({
      name,
      genericName,
      category,
      batchNumber,
      manufacturer,
      quantity,
      minimumStock,
      expiryDate,
      purchaseDate,
      price,
      description,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      userId: req.user._id,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Medicine added successfully",
      medicine,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Add batch medicines (e.g. from scanned bill)
const addMedicinesBatch = async (req, res, next) => {
  try {
    const { medicines } = req.body;

    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      res.status(400);
      throw new Error("Please provide an array of medicines to add");
    }

    // Validate required fields for each medicine
    for (const med of medicines) {
      if (!med.name || med.quantity === undefined || !med.expiryDate) {
        res.status(400);
        throw new Error(`Medicine '${med.name || "Unknown"}' is missing required fields (name, quantity, or expiry date)`);
      }
    }

    const docsToInsert = medicines.map((med) => ({
      name: med.name,
      genericName: med.genericName || "",
      category: med.category || "General",
      batchNumber: med.batchNumber || "",
      manufacturer: med.manufacturer || "",
      quantity: Number(med.quantity) || 1,
      minimumStock: med.minimumStock !== undefined ? Number(med.minimumStock) : 10,
      expiryDate: new Date(med.expiryDate),
      purchaseDate: med.purchaseDate ? new Date(med.purchaseDate) : new Date(),
      price: med.price !== undefined ? Number(med.price) : 0,
      description: med.description || "",
      image: med.image || null,
      userId: req.user._id,
      createdBy: req.user._id,
    }));

    const inserted = await Medicine.insertMany(docsToInsert);

    res.status(201).json({
      success: true,
      message: `${inserted.length} medicines imported successfully`,
      count: inserted.length,
      medicines: inserted,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all medicines (scoped strictly to the logged-in user)
const getMedicines = async (req, res, next) => {
  try {
    // 1. Pagination setup
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 2. Base query strictly filtered to the authenticated user
    const userQuery = getUserQuery(req);
    let filter = { ...userQuery };

    if (req.query.category && req.query.category !== "all") {
      filter.category = new RegExp(`^${req.query.category.trim()}$`, "i");
    }

    if (req.query.search && req.query.search.trim()) {
      const term = req.query.search.trim();
      const searchRegex = new RegExp(term, "i");
      filter.$and = [
        userQuery,
        {
          $or: [
            { name: searchRegex },
            { genericName: searchRegex },
            { batchNumber: searchRegex },
            { manufacturer: searchRegex },
          ],
        },
      ];
      delete filter.$or;
    }

    // 3. Fetch the paginated chunk from MongoDB (user-isolated)
    const medicines = await Medicine.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // 4. Count total documents strictly for the authenticated user
    const totalItems = await Medicine.countDocuments(filter);

    // 5. Format the medicines
    const formattedMedicines = medicines.map((medicine) => ({
      ...medicine.toObject(),
      expiryStatus: getExpiryStatus(medicine.expiryDate),
      daysUntilExpiry: getDaysUntilExpiry(medicine.expiryDate),
      lowStock: isLowStock(
        medicine.quantity,
        medicine.minimumStock
      ),
    }));

    // 6. Send unified response to frontend
    res.status(200).json({
      success: true,
      data: formattedMedicines,
      medicines: formattedMedicines,
      count: formattedMedicines.length,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit) || 1,
      totalItems: totalItems,
    });
    
  } catch (error) {
    next(error); 
  }
};

// @desc Get single medicine (user-isolated)
const getMedicineById = async (req, res, next) => {
  try {
    const userQuery = getUserQuery(req);
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      ...userQuery,
    });

    if (!medicine) {
      res.status(404);
      throw new Error("Medicine not found");
    }

    const formattedMedicine = {
      ...medicine.toObject(),
      expiryStatus: getExpiryStatus(medicine.expiryDate),
      daysUntilExpiry: getDaysUntilExpiry(medicine.expiryDate),
      lowStock: isLowStock(
        medicine.quantity,
        medicine.minimumStock
      ),
    };

    res.status(200).json({
      success: true,
      medicine: formattedMedicine,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update medicine (user-isolated)
const updateMedicine = async (req, res, next) => {
  try {
    const userQuery = getUserQuery(req);
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      ...userQuery,
    });

    if (!medicine) {
      res.status(404);
      throw new Error("Medicine not found");
    }

    const fields = [
      "name",
      "genericName",
      "category",
      "batchNumber",
      "manufacturer",
      "quantity",
      "minimumStock",
      "expiryDate",
      "purchaseDate",
      "price",
      "description",
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        medicine[field] = req.body[field];
      }
    });

    if (req.file) {
      medicine.image = `/uploads/${req.file.filename}`;
    }

    const updatedMedicine = await medicine.save();

    res.status(200).json({
      success: true,
      message: "Medicine updated successfully",
      medicine: updatedMedicine,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Delete medicine (user-isolated)
const deleteMedicine = async (req, res, next) => {
  try {
    const userQuery = getUserQuery(req);
    const medicine = await Medicine.findOne({
      _id: req.params.id,
      ...userQuery,
    });

    if (!medicine) {
      res.status(404);
      throw new Error("Medicine not found");
    }

    await medicine.deleteOne();

    res.status(200).json({
      success: true,
      message: "Medicine deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get expired medicines (user-isolated)
const getExpiredMedicines = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userQuery = getUserQuery(req);
    const medicines = await Medicine.find({
      ...userQuery,
      expiryDate: { $lt: today },
    }).sort({ expiryDate: 1 });

    const formattedMedicines = medicines.map((medicine) => ({
      ...medicine.toObject(),
      expiryStatus: getExpiryStatus(medicine.expiryDate),
      daysUntilExpiry: getDaysUntilExpiry(medicine.expiryDate),
      lowStock: isLowStock(
        medicine.quantity,
        medicine.minimumStock
      ),
    }));

    res.status(200).json({
      success: true,
      count: formattedMedicines.length,
      medicines: formattedMedicines,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get medicines expiring within 30 days (user-isolated)
const getExpiringMedicines = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    const userQuery = getUserQuery(req);
    const medicines = await Medicine.find({
      ...userQuery,
      expiryDate: {
        $gte: today,
        $lte: thirtyDaysLater,
      },
    }).sort({ expiryDate: 1 });

    const formattedMedicines = medicines.map((medicine) => ({
      ...medicine.toObject(),
      expiryStatus: getExpiryStatus(medicine.expiryDate),
      daysUntilExpiry: getDaysUntilExpiry(medicine.expiryDate),
      lowStock: isLowStock(
        medicine.quantity,
        medicine.minimumStock
      ),
    }));

    res.status(200).json({
      success: true,
      count: formattedMedicines.length,
      medicines: formattedMedicines,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get low-stock medicines (user-isolated)
const getLowStockMedicines = async (req, res, next) => {
  try {
    const userQuery = getUserQuery(req);
    const medicines = await Medicine.find({
      ...userQuery,
      $expr: {
        $lte: ["$quantity", "$minimumStock"],
      },
    }).sort({ quantity: 1 });

    const formattedMedicines = medicines.map((medicine) => ({
      ...medicine.toObject(),
      expiryStatus: getExpiryStatus(medicine.expiryDate),
      daysUntilExpiry: getDaysUntilExpiry(medicine.expiryDate),
      lowStock: isLowStock(
        medicine.quantity,
        medicine.minimumStock
      ),
    }));

    res.status(200).json({
      success: true,
      count: formattedMedicines.length,
      medicines: formattedMedicines,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addMedicine,
  addMedicinesBatch,
  getMedicines,
  getMedicineById,
  updateMedicine,
  deleteMedicine,
  getExpiredMedicines,
  getExpiringMedicines,
  getLowStockMedicines,
};