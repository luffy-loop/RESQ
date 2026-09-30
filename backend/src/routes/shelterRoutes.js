const express = require("express");
const { createShelter, getShelters, updateShelter, reserveShelter } = require("../controllers/shelterController");
const { requireAuth, allowRoles } = require("../middleware/auth");
const router = express.Router();
router.post("/", requireAuth, allowRoles("AUTHORITY", "NGO"), createShelter);
router.get("/", getShelters);
router.patch("/:id", requireAuth, allowRoles("AUTHORITY", "NGO"), updateShelter);
router.post("/:id/reserve", reserveShelter);
module.exports = router;
