const express = require("express");

const {
  createSupply,
  getSupplies,
  updateSupply,
  reserveSupply
} = require("../controllers/supplyController");

const router = express.Router();

router.post("/", createSupply);
router.get("/", getSupplies);
router.patch("/:id", updateSupply);
router.post("/:id/reserve", reserveSupply);

module.exports = router;