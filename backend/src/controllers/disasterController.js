const Disaster = require("../models/Disaster");

const createDisaster = async (req, res) => {
  try {
    const { name, type, severity, summary, affectedPeople, location } = req.body;
    if (!name?.trim() || !type || !Array.isArray(location?.coordinates) || location.coordinates.length !== 2) {
      return res.status(400).json({ message: "Incident name, type and location are required" });
    }
    await Disaster.updateMany({ status: "ACTIVE" }, { status: "CONTAINED" });
    const disaster = await Disaster.create({
      name: name.trim(), type, severity, summary: summary?.trim() || "", affectedPeople: Number(affectedPeople) || 0,
      location: { type: "Point", coordinates: location.coordinates.map(Number) }
    });
    req.app.get("io")?.emit("disaster-updated", disaster);
    res.status(201).json({ success: true, disaster });
  } catch (err) { res.status(400).json({ message: err.message }); }
};

const getActiveDisaster = async (req, res) => {
  try {
    const disaster = await Disaster.findOne({ status: "ACTIVE" }).sort({ createdAt: -1 });
    res.json({ success: true, disaster });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getDisasters = async (req, res) => {
  try { res.json(await Disaster.find().sort({ createdAt: -1 }).limit(50)); }
  catch (err) { res.status(500).json({ message: err.message }); }
};

const updateDisaster = async (req, res) => {
  try {
    const disaster = await Disaster.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!disaster) return res.status(404).json({ message: "Incident not found" });
    req.app.get("io")?.emit("disaster-updated", disaster);
    res.json({ success: true, disaster });
  } catch (err) { res.status(400).json({ message: err.message }); }
};

module.exports = { createDisaster, getActiveDisaster, getDisasters, updateDisaster };
