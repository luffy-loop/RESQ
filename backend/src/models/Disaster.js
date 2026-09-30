const mongoose = require("mongoose");

const disasterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ["FLOOD", "EARTHQUAKE", "CYCLONE", "FIRE", "LANDSLIDE", "OTHER"], required: true },
    severity: { type: String, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"], default: "HIGH" },
    status: { type: String, enum: ["ACTIVE", "CONTAINED", "CLOSED"], default: "ACTIVE" },
    summary: { type: String, default: "" },
    affectedPeople: { type: Number, default: 0, min: 0 },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }
    },
    startedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

disasterSchema.index({ location: "2dsphere" });
disasterSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Disaster", disasterSchema);
