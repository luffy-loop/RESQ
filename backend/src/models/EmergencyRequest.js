const mongoose = require("mongoose");

const emergencyRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reporterToken: { type: String, index: true },
    reporterName: String,
    reporterPhone: String,
    disasterType: { type: String, enum: ["FLOOD", "EARTHQUAKE", "CYCLONE", "FIRE", "LANDSLIDE", "OTHER"], default: "OTHER" },
    requestType: { type: String, enum: ["MEDICAL", "FOOD", "WATER", "RESCUE", "SHELTER", "CLOTHING", "OTHER"], required: true },
    title: { type: String, required: true, trim: true },
    description: String,
    peopleCount: { type: Number, default: 1, min: 1 },
    priority: { type: String, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"], default: "MEDIUM" },
    status: { type: String, enum: ["PENDING", "ASSIGNED", "ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "RESOLVED", "CANCELLED"], default: "PENDING" },
    location: { type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], required: true } },
    assignedVolunteer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignment: {
      matchScore: { type: Number, min: 0, max: 100 },
      distanceKm: { type: Number, min: 0 },
      etaMinutes: { type: Number, min: 0 },
      matchedSkills: [String],
      reasoning: String,
      estimatedSpeedKmh: Number,
      estimatedAt: Date,
      routeUrl: String
    },
    demoSeed: { type: Boolean, default: false },
    embedding: { type: [Number], select: false },
    intelligence: {
      score: { type: Number, min: 0, max: 100 },
      recommendedPriority: { type: String, enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
      requiredResources: [String],
      recommendedSkills: [String],
      reasoning: String,
      analyzedAt: Date
    }
  },
  { timestamps: true }
);

emergencyRequestSchema.index({ location: "2dsphere" });
emergencyRequestSchema.index({ status: 1, priority: 1, createdAt: -1 });
emergencyRequestSchema.index({ disasterType: 1, createdAt: -1 });

module.exports = mongoose.model("EmergencyRequest", emergencyRequestSchema);
