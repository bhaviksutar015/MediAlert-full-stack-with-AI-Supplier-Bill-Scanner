const Medicine = require("../models/Medicine");

// GET /api/dashboard
const getDashboardData = async (req, res) => {
  try {
    const userId = req.user._id;
    const userMatch = {
      $or: [
        { userId: userId },
        { createdBy: userId },
      ],
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Date after 30 days
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(today.getDate() + 30);

    // Total medicines
    const totalMedicines = await Medicine.countDocuments(userMatch);

    // Expired medicines
    const expiredMedicines = await Medicine.countDocuments({
      ...userMatch,
      expiryDate: {
        $lt: today,
      },
    });

    // Medicines expiring within 30 days
    const expiringSoon = await Medicine.countDocuments({
      ...userMatch,
      expiryDate: {
        $gte: today,
        $lte: thirtyDaysLater,
      },
    });

    // Low stock medicines
    const lowStock = await Medicine.countDocuments({
      ...userMatch,
      $expr: {
        $lte: ["$quantity", "$minimumStock"],
      },
    });

    // Category breakdown
    const categoryStats = await Medicine.aggregate([
      { $match: userMatch },
      { $group: { _id: { $ifNull: ["$category", "General"] }, count: { $sum: 1 }, totalQuantity: { $sum: "$quantity" } } },
      { $sort: { count: -1 } },
    ]);

    // Recent medicines
    const recentMedicines = await Medicine.find(userMatch)
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalMedicines,
        expiredMedicines,
        expiringSoon,
        lowStock,
        categoryStats,
        recentMedicines,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
    });
  }
};

module.exports = {
  getDashboardData,
};
