const Supply = require("../models/Supply");

const validateLocation = coordinates =>
  Array.isArray(coordinates) &&
  coordinates.length === 2 &&
  coordinates.every(value => typeof value === "number") &&
  coordinates[0] >= -180 &&
  coordinates[0] <= 180 &&
  coordinates[1] >= -90 &&
  coordinates[1] <= 90;

const createSupply = async (req, res) => {
  try {
    const {
      name,
      category,
      quantity,
      unit,
      available,
      provider,
      providerName,
      contact,
      location
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Supply name is required" });
    }

    if (!provider || !providerName) {
      return res.status(400).json({
        message: "Supply provider is required"
      });
    }

    if (!location?.coordinates || !validateLocation(location.coordinates)) {
      return res.status(400).json({
        message: "Valid supply location is required"
      });
    }

    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty < 0) {
      return res.status(400).json({
        message: "Quantity must be a non-negative number"
      });
    }

    const supply = await Supply.create({
      name: name.trim(),
      category,
      quantity: qty,
      unit: unit?.trim() || "units",
      available: available !== false,
      provider,
      providerName: providerName.trim(),
      contact: contact?.trim(),
      location: {
        type: "Point",
        coordinates: location.coordinates
      }
    });

    const io = req.app.get("io");

    if (io) {
      io.to("command-center").emit("supply-created", supply);
    }

    res.status(201).json(supply);
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};

const getSupplies = async (req, res) => {
  try {
    const supplies = await Supply.find({ available: true })
      .populate("provider", "name email phone role")
      .sort({ createdAt: -1 });

    res.json(supplies);
  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};

const updateSupply = async (req, res) => {
  try {
    const allowed = [
      "name",
      "category",
      "quantity",
      "unit",
      "available",
      "contact",
      "location"
    ];

    const update = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        update[key] = req.body[key];
      }
    }

    if (update.name !== undefined) {
      update.name = String(update.name).trim();

      if (!update.name) {
        return res.status(400).json({
          message: "Supply name is required"
        });
      }
    }

    if (update.quantity !== undefined) {
      update.quantity = Number(update.quantity);

      if (!Number.isFinite(update.quantity) || update.quantity < 0) {
        return res.status(400).json({
          message: "Quantity must be a non-negative number"
        });
      }
    }

    if (update.location?.coordinates) {
      if (!validateLocation(update.location.coordinates)) {
        return res.status(400).json({
          message: "Invalid supply location"
        });
      }

      update.location = {
        type: "Point",
        coordinates: update.location.coordinates
      };
    }

    const supply = await Supply.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).populate("provider", "name email phone role");

    if (!supply) {
      return res.status(404).json({
        message: "Supply not found"
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.to("command-center").emit("supply-updated", supply);
    }

    res.json(supply);
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};

const reserveSupply = async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({
        message: "Quantity must be greater than zero"
      });
    }

    const supply = await Supply.findOneAndUpdate(
      {
        _id: req.params.id,
        available: true,
        quantity: { $gte: qty }
      },
      [
        {
          $set: {
            quantity: { $subtract: ["$quantity", qty] },
            available: { $gt: [{ $subtract: ["$quantity", qty] }, 0] }
          }
        }
      ],
      { new: true }
    ).populate("provider", "name email phone role");

    if (!supply) {
      return res.status(409).json({
        message: "Requested quantity is not available"
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.to("command-center").emit("supply-updated", supply);
    }

    res.json({
      success: true,
      message: "Supply reserved for response",
      supply
    });
  } catch (err) {
    res.status(400).json({
      message: err.message
    });
  }
};

module.exports = {
  createSupply,
  getSupplies,
  updateSupply,
  reserveSupply
};