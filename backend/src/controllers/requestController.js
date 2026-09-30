const crypto = require("crypto");
const EmergencyRequest = require("../models/EmergencyRequest");
const User = require("../models/User");
const { analyzeEmergency } = require("../services/responseIntelligence");
const { embedText, emergencyText } = require("../services/embeddingService");

const populateRequest = query => query.populate("requester", "name phone").populate("assignedVolunteer", "name phone skills location");

const emitRequestUpdate = (io, request, event = "emergency-updated") => {
  if (!io || !request) return;
  io.to("command-center").emit(event, request);
  if (request.requester?._id) io.to(`citizen:${request.requester._id}`).emit("emergency-updated", request);
  if (request.reporterToken) io.to(`reporter:${request.reporterToken}`).emit("emergency-updated", request);
  if (request.assignedVolunteer?._id) io.to(`volunteer:${request.assignedVolunteer._id}`).emit("emergency-updated", request);
};

const validateLocation = coordinates => Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(value => Number.isFinite(Number(value))) && Number(coordinates[0]) >= -180 && Number(coordinates[0]) <= 180 && Number(coordinates[1]) >= -90 && Number(coordinates[1]) <= 90;

const findNearestVolunteer = async request => {
  const skills = request.intelligence?.recommendedSkills?.length ? request.intelligence.recommendedSkills : [request.requestType];
  const base = { role: "VOLUNTEER", available: true };
  let volunteer = await User.findOne({
    ...base,
    skills: { $in: skills },
    location: { $near: { $geometry: request.location, $maxDistance: 20000 } }
  }).select("-password");
  if (!volunteer) {
    volunteer = await User.findOne({
      ...base,
      location: { $near: { $geometry: request.location, $maxDistance: 20000 } }
    }).select("-password");
  }
  return volunteer;
};

const autoAssignExistingRequest = async (request, io) => {
  if (!request || request.status !== "PENDING") return null;
  const volunteer = await findNearestVolunteer(request);
  if (!volunteer) return null;
  request.assignedVolunteer = volunteer._id;
  request.status = "ASSIGNED";
  await request.save();
  volunteer.available = false;
  await volunteer.save();
  const updated = await populateRequest(EmergencyRequest.findById(request._id));
  emitRequestUpdate(io, updated, "emergency-assigned");
  io?.to(`volunteer:${volunteer._id}`).emit("volunteer-assigned", { request: updated, volunteer: { _id: volunteer._id, name: volunteer.name, skills: volunteer.skills } });
  return updated;
};

const createRequest = async (req, res) => {
  try {
    const { requester, reporterToken: clientToken, reporterName, reporterPhone, disasterType, requestType, title, description, peopleCount, priority, location } = req.body;
    if (!requestType || !title?.trim() || !validateLocation(location?.coordinates)) return res.status(400).json({ success: false, message: "Emergency details and valid GPS location are required" });
    const reporterToken = clientToken || crypto.randomBytes(18).toString("hex");
    const draft = { disasterType: disasterType || "OTHER", requestType, title: title.trim(), description: description?.trim() || "", peopleCount: Math.max(1, Number(peopleCount) || 1), priority: priority || "MEDIUM" };
    const intelligence = analyzeEmergency(draft);
    let embedding = null;
    try { embedding = await embedText(emergencyText({ ...draft, intelligence })); } catch (embeddingError) { console.warn("Embedding skipped:", embeddingError.message); }
    const request = await EmergencyRequest.create({ requester: requester || undefined, reporterToken, reporterName: reporterName?.trim() || undefined, reporterPhone: reporterPhone?.trim() || undefined, ...draft, priority: intelligence.recommendedPriority, embedding: embedding || undefined, intelligence: { ...intelligence, analyzedAt: new Date() }, location: { type: "Point", coordinates: location.coordinates.map(Number) } });
    const io = req.app.get("io");
    let populated = await populateRequest(EmergencyRequest.findById(request._id));
    const assigned = await autoAssignExistingRequest(request, io);
    if (assigned) populated = assigned;
    else io?.to("command-center").emit("emergency-created", populated);
    res.status(201).json({ success: true, message: assigned ? "Emergency created and nearest responder assigned" : "Emergency request created and added to the response queue", reporterToken, request: populated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getRequestById = async (req, res) => { try { const request = await populateRequest(EmergencyRequest.findById(req.params.id)); if (!request) return res.status(404).json({ success:false, message:"Request not found" }); res.json({success:true,request}); } catch(err){res.status(500).json({success:false,message:err.message});} };
const getPublicRequests = async (req, res) => { try { const token=String(req.query.token||"").trim(); if(!token)return res.status(400).json({success:false,message:"Report token is required"}); const requests=await populateRequest(EmergencyRequest.find({reporterToken:token}).sort({createdAt:-1})); res.json({success:true,count:requests.length,requests}); } catch(err){res.status(500).json({success:false,message:err.message});} };
const getRequests = async (req,res)=>{try{const requests=await populateRequest(EmergencyRequest.find().sort({priority:1,createdAt:-1}));res.json({success:true,count:requests.length,requests});}catch(err){res.status(500).json({success:false,message:err.message});}};

const updateRequest = async (req,res)=>{
  try {
    const oldRequest=await EmergencyRequest.findById(req.params.id); if(!oldRequest)return res.status(404).json({success:false,message:"Request not found"});
    const allowed={}; ["status","priority","description","title","peopleCount"].forEach(key=>{if(req.body[key]!==undefined)allowed[key]=req.body[key];});
    if(req.user?.role === "VOLUNTEER" && !["IN_PROGRESS","RESOLVED"].includes(req.body.status)) return res.status(403).json({success:false,message:"Volunteers can only start or resolve responses"});
    const request=await populateRequest(EmergencyRequest.findByIdAndUpdate(req.params.id,allowed,{new:true,runValidators:true}));
    if(req.body.status==="RESOLVED"&&oldRequest.assignedVolunteer)await User.findByIdAndUpdate(oldRequest.assignedVolunteer,{available:true});
    const event=request.status==="ASSIGNED"?"emergency-assigned":request.status==="IN_PROGRESS"?"emergency-in-progress":request.status==="RESOLVED"?"emergency-resolved":"emergency-updated";
    emitRequestUpdate(req.app.get("io"),request,event); res.json({success:true,request});
  } catch(err){res.status(400).json({success:false,message:err.message});}
};

const assignToVolunteer = async (req,res)=>{
  try {
    const { volunteerId }=req.body;
    if (req.user?.role === "VOLUNTEER" && String(req.user._id) !== String(volunteerId)) return res.status(403).json({ success:false, message:"Volunteers can only accept requests for themselves" });
    const request=await EmergencyRequest.findById(req.params.id); if(!request)return res.status(404).json({message:"Emergency request not found"});
    if(request.status!=="PENDING")return res.status(400).json({message:"This emergency is no longer available"});
    const volunteer=await User.findOne({_id:volunteerId,role:"VOLUNTEER",available:true}).select("-password"); if(!volunteer)return res.status(409).json({message:"Volunteer is unavailable"});
    request.assignedVolunteer=volunteer._id; request.status="ASSIGNED"; await request.save(); volunteer.available=false; await volunteer.save();
    const updated=await populateRequest(EmergencyRequest.findById(request._id)); const io=req.app.get("io"); emitRequestUpdate(io,updated); io?.to(`volunteer:${volunteer._id}`).emit("volunteer-assigned",{request:updated,volunteer:{_id:volunteer._id,name:volunteer.name,skills:volunteer.skills}});
    res.json({success:true,request:updated,volunteer});
  } catch(err){res.status(500).json({success:false,message:err.message});}
};

const autoAssignVolunteer = async (req,res)=>{
  try {
    const request=await EmergencyRequest.findById(req.params.id); if(!request)return res.status(404).json({success:false,message:"Emergency request not found"});
    if(request.status!=="PENDING")return res.status(400).json({success:false,message:"Request is already assigned or completed"});
    const updated = await autoAssignExistingRequest(request, req.app.get("io"));
    if(!updated)return res.status(404).json({success:false,message:"No available volunteer found within 20 km"});
    res.json({success:true,message:"Nearest suitable volunteer automatically assigned",volunteer:updated.assignedVolunteer,request:updated});
  } catch(err){res.status(500).json({success:false,message:err.message});}
};

module.exports={createRequest,getRequestById,getPublicRequests,getRequests,updateRequest,autoAssignVolunteer,assignToVolunteer};
