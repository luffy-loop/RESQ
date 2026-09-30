const Shelter = require("../models/Shelter");

const createShelter = async (req, res) => {
  try {
    const shelter = await Shelter.create(req.body);
    res.status(201).json(shelter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const getShelters = async (req, res) => {
  try {
    const shelters = await Shelter.find({ active: true }).sort({
      createdAt: -1
    });

    res.json(shelters);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateShelter = async (req, res) => {
  try {
    const shelter = await Shelter.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!shelter) {
      return res.status(404).json({ message: "Shelter not found" });
    }

    res.json(shelter);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const reserveShelter = async (req, res) => {
  try {
    const count = Number(req.body.peopleCount);

    if (!Number.isInteger(count) || count <= 0) {
      return res.status(400).json({
        message: "People count must be a positive whole number"
      });
    }

    const shelter = await Shelter.findOneAndUpdate(
      {
        _id: req.params.id,
        active: true,
        $expr: {
          $gte: [
            { $subtract: ["$capacity", "$occupied"] },
            count
          ]
        }
      },
      {
        $inc: { occupied: count }
      },
      { new: true, runValidators: true }
    );

    if (!shelter) {
      return res.status(409).json({
        message: "Not enough shelter capacity available"
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.to("command-center").emit("shelter-updated", shelter);
    }

    res.json({
      success: true,
      message: "Shelter space reserved",
      shelter
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  createShelter,
  getShelters,
  updateShelter,
  reserveShelter
};