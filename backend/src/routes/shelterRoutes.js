const express = require("express");

const {
  createShelter,
  getShelters,
  updateShelter,
  reserveShelter
} = require("../controllers/shelterController");

const router = express.Router();

router.post("/", createShelter);
router.get("/", getShelters);
router.patch("/:id", updateShelter);
router.post("/:id/reserve", reserveShelter);

module.exports = router;