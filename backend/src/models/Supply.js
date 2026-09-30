const mongoose = require("mongoose");

const supplySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: [
        "FOOD",
        "WATER",
        "MEDICAL",
        "CLOTHING",
        "SHELTER",
        "RESCUE",
        "OTHER"
      ],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      default: "units",
      trim: true
    },
    available: {
      type: Boolean,
      default: true
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    providerName: {
      type: String,
      required: true,
      trim: true
    },
    contact: String,
    demoSeed: { type: Boolean, default: false },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point"
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },
  { timestamps: true }
);

supplySchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Supply", supplySchema);