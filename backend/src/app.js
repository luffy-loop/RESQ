const express = require("express");
const cors = require("cors");

const requestRoutes = require("./routes/requestRoutes");
const authRoutes = require("./routes/authRoutes");
const volunteerRoutes = require("./routes/volunteerRoutes");
const shelterRoutes = require("./routes/shelterRoutes");
const supplyRoutes = require("./routes/supplyRoutes");
const disasterRoutes = require("./routes/disasterRoutes");
const intelligenceRoutes = require("./routes/intelligenceRoutes");
const vectorSearchRoutes = require("./routes/vectorSearchRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/volunteers", volunteerRoutes);
app.use("/api/shelters", shelterRoutes);
app.use("/api/supplies", supplyRoutes);
app.use("/api/disasters", disasterRoutes);

app.get("/", (req, res) => {
  res.json({
    name: "RESQ API",
    status: "operational"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/intelligence", intelligenceRoutes);
app.use("/api/search", vectorSearchRoutes);

module.exports = app;