const express = require("express");
const { createDisaster, getActiveDisaster, getDisasters, updateDisaster } = require("../controllers/disasterController");
const router = express.Router();
router.get("/active", getActiveDisaster);
router.get("/", getDisasters);
router.post("/", createDisaster);
router.patch("/:id", updateDisaster);
module.exports = router;
