const crypto = require("crypto");
const EmergencyRequest = require("../models/EmergencyRequest");
const User = require("../models/User");

const populateRequest = query => query.populate("requester", "name phone").populate("assignedVolunteer", "name phone skills location");

const emitRequestUpdate = (io, request, event = "emergency-updated") => {
  if (!io || !request) return;
  io.to("command-center").emit(event, request);
  if (request.requester?._id) io.to(`citizen:${request.requester._id}`).emit("emergency-updated", request);
  if (request.reporterToken) io.to(`reporter:${request.reporterToken}`).emit("emergency-updated", request);
  if (request.assignedVolunteer?._id) io.to(`volunteer:${request.assignedVolunteer._id}`).emit("emergency-updated", request);
};

const validateLocation = coordinates => Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(value => Number.isFinite(Number(value))) && Number(coordinates[0]) >= -180 && Number(coordinates[0]) <= 180 && Number(coordinates[1]) >= -90 && Number(coordinates[1]) <= 90;

const createRequest = async (req, res) => {
  try {
    const { requester, reporterToken: clientToken, reporterName, reporterPhone, disasterType, requestType, title, description, peopleCount, priority, location } = req.body;
    if (!requestType || !title?.trim() || !validateLocation(location?.coordinates)) return res.status(400).json({ success: false, message: "Emergency details and valid GPS location are required" });
    const reporterToken = clientToken || crypto.randomBytes(18).toString("hex");
    const request = await EmergencyRequest.create({ requester: requester || undefined, reporterToken, reporterName: reporterName?.trim() || undefined, reporterPhone: reporterPhone?.trim() || undefined, disasterType: disasterType || "OTHER", requestType, title: title.trim(), description: description?.trim() || "", peopleCount: Math.max(1, Number(peopleCount) || 1), priority: priority || "MEDIUM", location: { type: "Point", coordinates: location.coordinates.map(Number) } });
    const populated = await populateRequest(EmergencyRequest.findById(request._id));
    req.app.get("io")?.to("command-center").emit("emergency-created", populated);
    res.status(201).json({ success: true, message: "Emergency request created", reporterToken, request: populated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

const getRequestById = async (req, res) => { try { const request = await populateRequest(EmergencyRequest.findById(req.params.id)); if (!request) return res.status(404).json({ success:false, message:"Request not found" }); res.json({success:true,request}); } catch(err){res.status(500).json({success:false,message:err.message});} };
const getPublicRequests = async (req, res) => { try { const token=String(req.query.token||"").trim(); if(!token)return res.status(400).json({success:false,message:"Report token is required"}); const requests=await populateRequest(EmergencyRequest.find({reporterToken:token}).sort({createdAt:-1})); res.json({success:true,count:requests.length,requests}); } catch(err){res.status(500).json({success:false,message:err.message});} };
const getRequests = async (req,res)=>{try{const requests=await populateRequest(EmergencyRequest.find().sort({priority:1,createdAt:-1}));res.json({success:true,count:requests.length,requests});}catch(err){res.status(500).json({success:false,message:err.message});}};

const updateRequest = async (req,res)=>{
  try {
    const oldRequest=await EmergencyRequest.findById(req.params.id); if(!oldRequest)return res.status(404).json({success:false,message:"Request not found"});
    const allowed={}; ["status","priority","description","title","peopleCount"].forEach(key=>{if(req.body[key]!==undefined)allowed[key]=req.body[key];});
    const request=await populateRequest(EmergencyRequest.findByIdAndUpdate(req.params.id,allowed,{new:true,runValidators:true}));
    if(req.body.status==="RESOLVED"&&oldRequest.assignedVolunteer)await User.findByIdAndUpdate(oldRequest.assignedVolunteer,{available:true});
    const event=request.status==="ASSIGNED"?"emergency-assigned":request.status==="IN_PROGRESS"?"emergency-in-progress":request.status==="RESOLVED"?"emergency-resolved":"emergency-updated";
    emitRequestUpdate(req.app.get("io"),request,event); res.json({success:true,request});
  } catch(err){res.status(400).json({success:false,message:err.message});}
};

const assignToVolunteer = async (req,res)=>{
  try {
    const { volunteerId }=req.body;
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
    const base={role:"VOLUNTEER",available:true};
    let volunteer=await User.findOne({...base,skills:request.requestType,location:{$near:{$geometry:request.location,$maxDistance:20000}}}).select("-password");
    if(!volunteer) volunteer=await User.findOne({...base,location:{$near:{$geometry:request.location,$maxDistance:20000}}}).select("-password");
    if(!volunteer)return res.status(404).json({success:false,message:"No available volunteer found within 20 km"});
    request.assignedVolunteer=volunteer._id; request.status="ASSIGNED"; await request.save(); volunteer.available=false; await volunteer.save();
    const updated=await populateRequest(EmergencyRequest.findById(request._id)); const io=req.app.get("io"); emitRequestUpdate(io,updated); io?.to(`volunteer:${volunteer._id}`).emit("volunteer-assigned",{request:updated,volunteer:{_id:volunteer._id,name:volunteer.name,skills:volunteer.skills}});
    res.json({success:true,message:"Volunteer automatically assigned",volunteer,request:updated});
  } catch(err){res.status(500).json({success:false,message:err.message});}
};

module.exports={createRequest,getRequestById,getPublicRequests,getRequests,updateRequest,autoAssignVolunteer,assignToVolunteer};
