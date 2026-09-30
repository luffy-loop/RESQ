require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const EmergencyRequest = require("./models/EmergencyRequest");
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" }, transports: ["polling", "websocket"] });

io.on("connection", socket => {
  socket.on("join-command-center", () => socket.join("command-center"));
  socket.on("join-volunteers", () => socket.join("volunteers"));
  socket.on("join-volunteer", id => socket.join(`volunteer:${id}`));
  socket.on("join-citizen", id => socket.join(`citizen:${id}`));
  socket.on("join-reporter", token => { if (typeof token === "string" && token.length >= 12) socket.join(`reporter:${token}`); });
  socket.on("volunteer-location", async data => {
    if (!data?.volunteerId || !Array.isArray(data.coordinates)) return;
    const [lng, lat] = data.coordinates;
    if (![lng, lat].every(Number.isFinite) || lng < -180 || lng > 180 || lat < -90 || lat > 90) return;
    const payload={volunteerId:data.volunteerId,coordinates:[lng,lat],timestamp:Date.now()};
    io.to("command-center").emit("volunteer-location",payload);
    const active=await EmergencyRequest.find({assignedVolunteer:data.volunteerId,status:{$in:["ASSIGNED","IN_PROGRESS"]}}).select("requester reporterToken");
    active.forEach(request=>{if(request.requester)io.to(`citizen:${request.requester}`).emit("responder-location",{...payload,requestId:String(request._id)});if(request.reporterToken)io.to(`reporter:${request.reporterToken}`).emit("responder-location",{...payload,requestId:String(request._id)});});
  });
});
app.set("io",io);
(async()=>{await connectDB();const port=process.env.PORT||5001;server.listen(port,()=>console.log(`RESQ server running on ${port}`));})();
