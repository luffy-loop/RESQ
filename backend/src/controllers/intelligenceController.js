const EmergencyRequest = require("../models/EmergencyRequest");
const { analyzeEmergency } = require("../services/responseIntelligence");
const { embedText, emergencyText } = require("../services/embeddingService");

const analyzeRequest = async (req, res) => {
  try {
    const request = await EmergencyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Emergency request not found" });
    const intelligence = analyzeEmergency(request);
    request.intelligence = { ...intelligence, analyzedAt: new Date() };
    request.priority = intelligence.recommendedPriority;
    try { request.embedding = await embedText(emergencyText({ ...request.toObject(), intelligence })); } catch (embeddingError) { console.warn("Embedding skipped:", embeddingError.message); }
    await request.save();
    res.json({ success: true, intelligence, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { analyzeRequest };
