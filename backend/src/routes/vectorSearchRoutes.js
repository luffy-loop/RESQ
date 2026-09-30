const express = require("express");
const { searchSimilarEmergencies } = require("../controllers/vectorSearchController");
const { requireAuth, allowRoles } = require("../middleware/auth");
const router = express.Router();
router.post("/emergencies", requireAuth, allowRoles("AUTHORITY", "NGO"), searchSimilarEmergencies);
module.exports = router;
