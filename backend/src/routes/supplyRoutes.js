const express = require("express");
const { createSupply, getSupplies, updateSupply, reserveSupply } = require("../controllers/supplyController");
const { requireAuth, allowRoles } = require("../middleware/auth");
const router = express.Router();
router.post("/", requireAuth, allowRoles("NGO", "AUTHORITY"), createSupply);
router.get("/", getSupplies);
router.patch("/:id", requireAuth, allowRoles("NGO", "AUTHORITY"), updateSupply);
router.post("/:id/reserve", requireAuth, allowRoles("NGO", "AUTHORITY"), reserveSupply);
module.exports = router;
