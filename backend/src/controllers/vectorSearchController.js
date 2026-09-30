const EmergencyRequest = require("../models/EmergencyRequest");

const searchSimilarEmergencies = async (req, res) => {
  try {
    const queryVector = Array.isArray(req.body.vector) ? req.body.vector.map(Number) : null;
    if (!queryVector?.length) return res.status(400).json({ success: false, message: "An embedding vector is required" });
    const index = process.env.MONGO_VECTOR_INDEX || "emergency_vector_index";
    const results = await EmergencyRequest.aggregate([
      { $vectorSearch: { index, path: "embedding", queryVector, numCandidates: 100, limit: Math.min(Number(req.body.limit) || 5, 20) } },
      { $project: { title: 1, description: 1, disasterType: 1, requestType: 1, priority: 1, status: 1, intelligence: 1, location: 1, score: { $meta: "vectorSearchScore" } } }
    ]);
    res.json({ success: true, count: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { searchSimilarEmergencies };
