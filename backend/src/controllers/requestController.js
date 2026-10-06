const crypto = require("crypto");
const EmergencyRequest = require("../models/EmergencyRequest");
const User = require("../models/User");
const { findBestResponder, buildResponderAssignment } = require("../services/responderMatching");
const { analyzeEmergency } = require("../services/responseIntelligence");
const { embedText, emergencyText } = require("../services/embeddingService");
const crypto = require("crypto");

const populateRequest = query => query.populate("requester", "name phone").populate("assignedVolunteer", "name phone skills location").populate("dispatchTeam.volunteer", "name phone skills location");

const STOP=new Set(["the","and","for","with","near","need","people","help","there","this","that","are","was","from","at"]);
const words=text=>[...new Set(String(text||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(word=>word.length>2&&!STOP.has(word)))];
const textSimilarity=(a,b)=>{const x=new Set(words(a)),y=new Set(words(b));if(!x.size||!y.size)return 0;let hit=0;x.forEach(word=>{if(y.has(word))hit++;});return hit/Math.max(x.size,y.size);};
const geoDistanceKm=(a,b)=>{const rad=Math.PI/180,[x1,y1]=a,[x2,y2]=b,dLat=(y2-y1)*rad,dLon=(x2-x1)*rad,h=Math.sin(dLat/2)**2+Math.cos(y1*rad)*Math.cos(y2*rad)*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};
const findRelatedReport=async draft=>{const candidates=await EmergencyRequest.find({disasterType:draft.disasterType,requestType:draft.requestType,status:{$nin:["RESOLVED","CANCELLED"]},location:{$near:{$geometry:{type:"Point",coordinates:draft.location.coordinates},$maxDistance:750}}}).limit(15).select("_id title description location incidentCluster");let best=null;for(const item of candidates){const distance=geoDistanceKm(draft.location.coordinates,item.location.coordinates),text=textSimilarity(draft.title+" "+draft.description,item.title+" "+item.description),score=Math.min(1,text*.7+Math.max(0,1-distance/.75)*.3);if(score>=.58&&(!best||score>best.score))best={item,score,distance};}return best;};
const attachIncidentCluster=async(request,best)=>{if(!best){request.incidentCluster=request.incidentCluster||crypto.randomUUID();return;}const cluster=best.item.incidentCluster||String(best.item._id);request.duplicateOf=best.item._id;request.duplicateScore=Number(best.score.toFixed(2));request.duplicateReason="Likely duplicate of an existing nearby report based on location, same need and overlapping details.";request.incidentCluster=cluster;request.relatedReports=[best.item._id];await EmergencyRequest.findByIdAndUpdate(best.item._id,{$addToSet:{relatedReports:request._id},$set:{incidentCluster:cluster}});};

const emitRequestUpdate = (io, request, event = "emergency-updated") => {
  if (!io || !request) return;
  io.to("command-center").emit(event, request);
  if (request.requester?._id) io.to(`citizen:${request.requester._id}`).emit("emergency-updated", request);
  if (request.reporterToken) io.to(`reporter:${request.reporterToken}`).emit("emergency-updated", request);
  if (request.assignedVolunteer?._id) io.to(`volunteer:${request.assignedVolunteer._id}`).emit("emergency-updated", request);
};

const validateLocation = coordinates => Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(value => Number.isFinite(Number(value))) && Number(coordinates[0]) >= -180 && Number(coordinates[0]) <= 180 && Number(coordinates[1]) >= -90 && Number(coordinates[1]) <= 90;

const autoDispatchTeam=async(request,io)=>{
  if(!request||request.status!=="PENDING")return null;
  const teamSize=request.priority==="CRITICAL"||Number(request.peopleCount)>=5?2:1,matches=await findBestResponders(request,[],teamSize);
  if(!matches.length)return null;
  const now=new Date(),primary=matches[0],dispatchTeam=matches.map((match,index)=>({volunteer:match.volunteer._id,role:index===0?"PRIMARY":(match.assignment.matchedSkills?.[0]||"SUPPORT"),status:"ASSIGNED",matchScore:match.assignment.matchScore,distanceKm:match.assignment.distanceKm,etaMinutes:match.assignment.etaMinutes,matchedSkills:match.assignment.matchedSkills,reasoning:match.assignment.reasoning,assignedAt:now}));
  const claimed=await EmergencyRequest.findOneAndUpdate({_id:request._id,status:"PENDING"},{$set:{assignedVolunteer:primary.volunteer._id,status:"ASSIGNED",assignment:primary.assignment,dispatchTeam,assignedAt:now,lastStatusAt:now}},{new:true,runValidators:true});
  if(!claimed)return null;
  const reserved=[];
  for(const match of matches){const volunteer=await User.findOneAndUpdate({_id:match.volunteer._id,role:"VOLUNTEER",available:true},{$set:{available:false}},{new:true}).select("-password");if(volunteer)reserved.push(volunteer);}
  if(reserved.length!==matches.length){if(reserved.length)await User.updateMany({_id:{$in:reserved.map(v=>v._id)}},{$set:{available:true}});await EmergencyRequest.findByIdAndUpdate(request._id,{$set:{status:"PENDING",lastStatusAt:new Date()},$unset:{assignedVolunteer:1,assignment:1,assignedAt:1,dispatchTeam:1}});return null;}
  const updated=await populateRequest(EmergencyRequest.findById(request._id));emitRequestUpdate(io,updated,"emergency-assigned");reserved.forEach(volunteer=>io?.to("volunteer:"+volunteer._id).emit("volunteer-assigned",{request:updated,volunteer:{_id:volunteer._id,name:volunteer.name,skills:volunteer.skills}}));return updated;
};
const autoAssignExistingRequest = async (request, io) => {
  if (!request || request.status !== "PENDING") return null;
  const multi=request.priority==="CRITICAL"||Number(request.peopleCount)>=5;
  if(multi)return autoDispatchTeam(request,io);
  const match=await findBestResponder(request);
  if (!match) return null;

  const claimed = await EmergencyRequest.findOneAndUpdate(
    { _id: request._id, status: "PENDING" },
    { $set: { assignedVolunteer: match.volunteer._id, status: "ASSIGNED", assignment: match.assignment, assignedAt: new Date(), lastStatusAt: new Date() } },
    { new: true, runValidators: true }
  );
  if (!claimed) return null;

  const volunteer = await User.findOneAndUpdate(
    { _id: match.volunteer._id, role: "VOLUNTEER", available: true },
    { $set: { available: false } },
    { new: true }
  ).select("-password");

  if (!volunteer) {
    await EmergencyRequest.findByIdAndUpdate(request._id, { $set: { status: "PENDING", lastStatusAt: new Date() }, $unset: { assignedVolunteer: 1, assignment: 1, assignedAt: 1 } });
    return null;
  }

  const updated = await populateRequest(EmergencyRequest.findById(request._id));
  emitRequestUpdate(io, updated, "emergency-assigned");
  io?.to(`volunteer:${volunteer._id}`).emit("volunteer-assigned", {
    request: updated,
    volunteer: { _id: volunteer._id, name: volunteer.name, skills: volunteer.skills }
  });
  return updated;
};

const nextVolunteerStatus = { ASSIGNED: "ACCEPTED", ACCEPTED: "ON_THE_WAY", ON_THE_WAY: "ARRIVED", ARRIVED: "IN_PROGRESS", IN_PROGRESS: "RESOLVED" };

const updateRequest = async (req, res) => {
  try {
    const oldRequest = await EmergencyRequest.findById(req.params.id);
    if (!oldRequest) return res.status(404).json({ success: false, message: "Request not found" });
    const allowed = {};
    ["status", "priority", "description", "title", "peopleCount"].forEach(key => { if (req.body[key] !== undefined) allowed[key] = req.body[key]; });

    if (req.user?.role === "VOLUNTEER") {
      const isAssigned = String(oldRequest.assignedVolunteer || "") === String(req.user._id);
      if (!isAssigned) return res.status(403).json({ success: false, message: "This emergency is not assigned to you" });
      if (!nextVolunteerStatus[oldRequest.status] || req.body.status !== nextVolunteerStatus[oldRequest.status]) return res.status(403).json({ success: false, message: "Follow the response sequence: Assigned → Accepted → On the way → Arrived → In progress → Completed" });
    }

    const request = await populateRequest(EmergencyRequest.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true }));
    if(req.body.status==="RESOLVED"){const ids=(oldRequest.dispatchTeam?.map(member=>member.volunteer)||[oldRequest.assignedVolunteer]).filter(Boolean);if(ids.length)await User.updateMany({_id:{$in:ids}},{$set:{available:true}});}

    const eventMap = { ASSIGNED: "emergency-assigned", ACCEPTED: "emergency-accepted", ON_THE_WAY: "emergency-on-the-way", ARRIVED: "emergency-arrived", IN_PROGRESS: "emergency-in-progress", RESOLVED: "emergency-resolved" };
    emitRequestUpdate(req.app.get("io"), request, eventMap[request.status] || "emergency-updated");
    res.json({ success: true, request });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
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
    const related=await findRelatedReport({ ...draft, location:{type:"Point",coordinates:location.coordinates.map(Number)} });
    await attachIncidentCluster(request,related);
    await request.save();
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
const getEmergencyHeatmap=async(req,res)=>{try{const since=new Date(Date.now()-86400000),requests=await EmergencyRequest.find({createdAt:{$gte:since}}).select("location priority peopleCount"),buckets=new Map();requests.forEach(item=>{const p=item.location?.coordinates;if(!Array.isArray(p)||p.length!==2)return;const key=[(Math.round(p[0]*1000)/1000).toFixed(3),(Math.round(p[1]*1000)/1000).toFixed(3)].join(","),[longitude,latitude]=key.split(",").map(Number),point=buckets.get(key)||{longitude,latitude,count:0,people:0,critical:0};point.count++;point.people+=Number(item.peopleCount||1);if(item.priority==="CRITICAL")point.critical++;buckets.set(key,point);});res.json({success:true,windowHours:24,points:[...buckets.values()].map(point=>({...point,density:Math.min(1,point.count/8+point.critical/10)}))});}catch(err){res.status(500).json({success:false,message:err.message});}};

const assignToVolunteer = async (req,res) => {
  try {
    const { volunteerId }=req.body;
    if (req.user?.role === "VOLUNTEER" && String(req.user._id) !== String(volunteerId)) return res.status(403).json({success:false,message:"Volunteers can only accept requests for themselves"});
    const request=await EmergencyRequest.findById(req.params.id); if(!request)return res.status(404).json({message:"Emergency request not found"});
    if(request.status!=="PENDING")return res.status(400).json({message:"This emergency is no longer available"});
    const volunteer=await User.findOne({_id:volunteerId,role:"VOLUNTEER",available:true}).select("-password"); if(!volunteer)return res.status(409).json({message:"Volunteer is unavailable"});
    const assignment = buildResponderAssignment(request, volunteer, "Assigned");
    const now = new Date();
    request.assignedVolunteer=volunteer._id; request.status="ASSIGNED"; request.assignment=assignment; request.assignedAt=now; request.lastStatusAt=now; await request.save(); volunteer.available=false; await volunteer.save();
    const updated=await populateRequest(EmergencyRequest.findById(request._id)); const io=req.app.get("io"); emitRequestUpdate(io,updated,"emergency-assigned"); io?.to(`volunteer:${volunteer._id}`).emit("volunteer-assigned",{request:updated,volunteer:{_id:volunteer._id,name:volunteer.name,skills:volunteer.skills}});
    res.json({success:true,request:updated,volunteer});
  } catch(err){res.status(500).json({success:false,message:err.message});}
};

const autoAssignVolunteer = async (req,res) => {
  try {
    const request=await EmergencyRequest.findById(req.params.id); if(!request)return res.status(404).json({success:false,message:"Emergency request not found"});
    if(request.status!=="PENDING")return res.status(400).json({success:false,message:"Request is already assigned or completed"});
    const updated=await autoAssignExistingRequest(request,req.app.get("io")); if(!updated)return res.status(404).json({success:false,message:"No available volunteer found within 30 km"});
    res.json({success:true,message:"Best available responder automatically assigned",volunteer:updated.assignedVolunteer,request:updated});
  } catch(err){res.status(500).json({success:false,message:err.message});}
};

module.exports={createRequest,getRequestById,getPublicRequests,getRequests,getEmergencyHeatmap,updateRequest,autoAssignVolunteer,assignToVolunteer};
