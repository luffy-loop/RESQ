const EmergencyRequest = require("../models/EmergencyRequest");
const User = require("../models/User");
const { findBestResponder } = require("./responderMatching");

const ACCEPTANCE_WINDOWS = { CRITICAL: 2, HIGH: 5, MEDIUM: 10, LOW: 15 };
const getAcceptanceWindowMinutes = priority => ACCEPTANCE_WINDOWS[String(priority || "MEDIUM").toUpperCase()] || 10;
const populateRequest = query => query.populate("requester", "name phone").populate("assignedVolunteer", "name phone skills location");

const emitEscalation = (io, request) => {
  if (!io || !request) return;
  io.to("command-center").emit("emergency-escalated", request);
  if (request.requester?._id) io.to("citizen:" + request.requester._id).emit("emergency-updated", request);
  if (request.reporterToken) io.to("reporter:" + request.reporterToken).emit("emergency-updated", request);
  if (request.assignedVolunteer?._id) io.to("volunteer:" + request.assignedVolunteer._id).emit("emergency-updated", request);
};

const escalateRequest = async (request, io) => {
  const previousVolunteerId = request.assignedVolunteer;
  const minutes = getAcceptanceWindowMinutes(request.priority);
  const reason = request.priority + " response was not accepted within " + minutes + " minutes.";
  const now = new Date();
  const released = await EmergencyRequest.findOneAndUpdate(
    { _id: request._id, status: "ASSIGNED", assignedVolunteer: previousVolunteerId, assignedAt: request.assignedAt },
    { $set: { status: "PENDING", lastStatusAt: now, lastEscalatedAt: now, escalationReason: reason }, $inc: { escalationCount: 1 }, $push: { escalationHistory: { volunteer: previousVolunteerId, escalatedAt: now, reason } }, $unset: { assignedVolunteer: 1, assignment: 1, assignedAt: 1 } },
    { new: true, runValidators: true }
  );
  if (!released) return null;
  await User.findOneAndUpdate({ _id: previousVolunteerId, role: "VOLUNTEER" }, { $set: { available: true } });
  const excluded = released.escalationHistory.map(item => String(item.volunteer));
  const match = await findBestResponder(released, excluded);
  if (!match) {
    const queued = await populateRequest(EmergencyRequest.findById(released._id));
    emitEscalation(io, queued);
    return queued;
  }
  const assignedAt = new Date();
  const claimed = await EmergencyRequest.findOneAndUpdate(
    { _id: released._id, status: "PENDING" },
    { $set: { assignedVolunteer: match.volunteer._id, status: "ASSIGNED", assignment: { ...match.assignment, reasoning: "Escalated and re-matched. " + match.assignment.reasoning }, assignedAt, lastStatusAt: assignedAt } },
    { new: true, runValidators: true }
  );
  if (!claimed) return null;
  const volunteer = await User.findOneAndUpdate({ _id: match.volunteer._id, role: "VOLUNTEER", available: true }, { $set: { available: false } }, { new: true }).select("name phone skills location");
  if (!volunteer) {
    await EmergencyRequest.findByIdAndUpdate(released._id, { $set: { status: "PENDING", lastStatusAt: new Date() }, $unset: { assignedVolunteer: 1, assignment: 1, assignedAt: 1 } });
    const queued = await populateRequest(EmergencyRequest.findById(released._id));
    emitEscalation(io, queued);
    return queued;
  }
  const updated = await populateRequest(EmergencyRequest.findById(claimed._id));
  emitEscalation(io, updated);
  io?.to("volunteer:" + volunteer._id).emit("volunteer-assigned", { request: updated, volunteer: { _id: volunteer._id, name: volunteer.name, skills: volunteer.skills } });
  return updated;
};

const processEscalations = async io => {
  const requests = await EmergencyRequest.find({ status: "ASSIGNED", assignedVolunteer: { $exists: true }, assignedAt: { $exists: true } }).select("_id priority assignedVolunteer assignedAt escalationHistory");
  const now = Date.now();
  for (const request of requests) {
    const deadline = new Date(request.assignedAt).getTime() + getAcceptanceWindowMinutes(request.priority) * 60000;
    if (deadline <= now) {
      try { await escalateRequest(request, io); } catch (err) { console.error("Failed to escalate request " + request._id + ":", err.message); }
    }
  }
};

module.exports = { ACCEPTANCE_WINDOWS, getAcceptanceWindowMinutes, processEscalations };
