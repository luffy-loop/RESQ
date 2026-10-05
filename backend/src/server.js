require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const EmergencyRequest = require("./models/EmergencyRequest");
const { processEscalations } = require("./services/escalationService");

const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:5173")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
  },
  transports: ["polling", "websocket"]
});

io.on("connection", socket => {
  socket.on("join-command-center", () => socket.join("command-center"));
  socket.on("join-volunteers", () => socket.join("volunteers"));
  socket.on("join-volunteer", id => socket.join(`volunteer:${id}`));
  socket.on("join-citizen", id => socket.join(`citizen:${id}`));
  socket.on("join-reporter", token => {
    if (typeof token === "string" && token.length >= 12) {
      socket.join(`reporter:${token}`);
    }
  });

  socket.on("volunteer-location", async data => {
    if (!data?.volunteerId || !Array.isArray(data.coordinates)) return;

    const [lng, lat] = data.coordinates;

    if (![lng, lat].every(Number.isFinite) || lng < -180 || lng > 180 || lat < -90 || lat > 90) return;

    const payload = {
      volunteerId: data.volunteerId,
      coordinates: [lng, lat],
      timestamp: Date.now()
    };

    io.to("command-center").emit("volunteer-location", payload);

    try {
      const active = await EmergencyRequest.find({
        assignedVolunteer: data.volunteerId,
        status: { $in: ["ASSIGNED", "IN_PROGRESS"] }
      }).select("requester reporterToken");

      active.forEach(request => {
        if (request.requester) {
          io.to(`citizen:${request.requester}`).emit("responder-location", {
            ...payload,
            requestId: String(request._id)
          });
        }

        if (request.reporterToken) {
          io.to(`reporter:${request.reporterToken}`).emit("responder-location", {
            ...payload,
            requestId: String(request._id)
          });
        }
      });
    } catch (err) {
      console.error("Failed to route volunteer location:", err.message);
    }
  });
});

app.set("io", io);

(async () => {
  await connectDB();

  const port = Number(process.env.PORT) || 5001;
  const escalationInterval = Number(process.env.RESQ_ESCALATION_INTERVAL_MS) || 30000;
  const runEscalations = () => processEscalations(io).catch(err => console.error("Escalation cycle failed:", err.message));
  await runEscalations();
  const escalationTimer = setInterval(runEscalations, escalationInterval);
  escalationTimer.unref?.();

  server.listen(port, "0.0.0.0", () => {
    console.log(`RESQ server running on ${port}`);
  });
})();
