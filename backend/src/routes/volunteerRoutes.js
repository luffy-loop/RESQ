const express = require("express");

const {
  createVolunteer,
  getVolunteers,
  updateVolunteerAvailability,
  updateVolunteerLocation,
  findNearbyVolunteers
} = require("../controllers/volunteerController");

const router = express.Router();

router.post("/", createVolunteer);
router.get("/", getVolunteers);
router.patch("/:id/availability", updateVolunteerAvailability);
router.patch("/:id/location", updateVolunteerLocation);
router.get("/nearby", findNearbyVolunteers);

module.exports = router;