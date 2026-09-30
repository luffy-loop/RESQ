const mongoose = require("mongoose");

const shelterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    address: String,
    capacity: {
      type: Number,
      required: true
    },
    occupied: {
      type: Number,
      default: 0,
      min: 0
    },
    resources: [String],
    contact: String,
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
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

shelterSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Shelter", shelterSchema);