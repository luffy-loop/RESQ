const express = require("express");
const { analyzeRequest } = require("../controllers/intelligenceController");
const { requireAuth, allowRoles } = require("../middleware/auth");
const router = express.Router();
router.post("/analyze/:id", requireAuth, allowRoles("AUTHORITY", "VOLUNTEER", "NGO"), analyzeRequest);
module.exports = router;
