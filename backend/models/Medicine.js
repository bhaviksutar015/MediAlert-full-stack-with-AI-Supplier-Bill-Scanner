const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Medicine name is required"],
      trim: true,
    },

    genericName: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      trim: true,
    },

    batchNumber: {
      type: String,
      trim: true,
    },

    manufacturer: {
      type: String,
      trim: true,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: 0,
    },

    minimumStock: {
      type: Number,
      default: 10,
      min: 0,
    },

    expiryDate: {
      type: Date,
      required: [true, "Expiry date is required"],
    },

    purchaseDate: {
      type: Date,
    },

    price: {
      type: Number,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      default: null,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-validate/save hook to keep userId and createdBy in sync
medicineSchema.pre("validate", function () {
  if (!this.userId && this.createdBy) {
    this.userId = this.createdBy;
  }
  if (!this.createdBy && this.userId) {
    this.createdBy = this.userId;
  }
});

// Indexes for fast user-isolated querying
medicineSchema.index({ userId: 1 });
medicineSchema.index({ userId: 1, expiryDate: 1 });
medicineSchema.index({ createdBy: 1 });

const Medicine = mongoose.model("Medicine", medicineSchema);

module.exports = Medicine;
