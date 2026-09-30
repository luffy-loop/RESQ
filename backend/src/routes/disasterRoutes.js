const express = require("express");
const { createDisaster, getActiveDisaster, getDisasters, updateDisaster } = require("../controllers/disasterController");
const { requireAuth, allowRoles } = require("../middleware/auth");
const router = express.Router();
router.get("/active", getActiveDisaster);
router.get("/", getDisasters);
router.post("/", requireAuth, allowRoles("AUTHORITY"), createDisaster);
router.patch("/:id", requireAuth, allowRoles("AUTHORITY"), updateDisaster);
module.exports = router;
