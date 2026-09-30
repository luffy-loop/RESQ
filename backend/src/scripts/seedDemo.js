require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const User = require("../models/User");
const Shelter = require("../models/Shelter");
const Supply = require("../models/Supply");
const Disaster = require("../models/Disaster");
const EmergencyRequest = require("../models/EmergencyRequest");
const { analyzeEmergency } = require("../services/responseIntelligence");
const { embedText, emergencyText } = require("../services/embeddingService");

const run = async () => {
  await connectDB();
  const password = await bcrypt.hash("resq-demo-123", 10);
  const users = [
    { name: "Aarav Rescue", email: "aarav@resq.demo", role: "VOLUNTEER", phone: "9000000001", skills: ["RESCUE"], available: true, location: { type: "Point", coordinates: [78.481, 17.389] } },
    { name: "Meera Medical", email: "meera@resq.demo", role: "VOLUNTEER", phone: "9000000002", skills: ["MEDICAL"], available: true, location: { type: "Point", coordinates: [78.489, 17.381] } },
    { name: "Rohan Relief", email: "rohan@resq.demo", role: "VOLUNTEER", phone: "9000000003", skills: ["FOOD", "WATER"], available: true, location: { type: "Point", coordinates: [78.475, 17.392] } },
    { name: "Kavya Shelter", email: "kavya@resq.demo", role: "VOLUNTEER", phone: "9000000004", skills: ["SHELTER"], available: true, location: { type: "Point", coordinates: [78.493, 17.377] } },
    { name: "RESQ Control", email: "authority@resq.demo", role: "AUTHORITY", phone: "9000000010", skills: [], available: false, location: { type: "Point", coordinates: [78.4867, 17.385] } },
    { name: "Hope NGO", email: "ngo@resq.demo", role: "NGO", phone: "9000000011", organizationName: "Hope Relief Network", skills: [], available: false, location: { type: "Point", coordinates: [78.486, 17.386] } }
  ];
  const created = {};
  for (const item of users) {
    created[item.email] = await User.findOneAndUpdate({ email: item.email }, { $set: { ...item, password } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  }
  await Shelter.deleteMany({ demoSeed: true });
  await Supply.deleteMany({ demoSeed: true });
  await EmergencyRequest.deleteMany({ demoSeed: true });
  await Shelter.insertMany([
    { name: "Charminar Relief Shelter", address: "Old City, Hyderabad", capacity: 120, occupied: 46, location: { type: "Point", coordinates: [78.4747, 17.3616] }, demoSeed: true },
    { name: "Nampally Community Shelter", address: "Nampally, Hyderabad", capacity: 90, occupied: 28, location: { type: "Point", coordinates: [78.4675, 17.393] }, demoSeed: true },
    { name: "Musheerabad Relief Center", address: "Musheerabad, Hyderabad", capacity: 150, occupied: 61, location: { type: "Point", coordinates: [78.502, 17.406] }, demoSeed: true }
  ]);
  await Supply.insertMany([
    { name: "Drinking Water", category: "WATER", quantity: 850, unit: "bottles", provider: created["ngo@resq.demo"]._id, providerName: "Hope Relief Network", location: { type: "Point", coordinates: [78.486, 17.386] }, demoSeed: true },
    { name: "Food Packets", category: "FOOD", quantity: 420, unit: "packs", provider: created["ngo@resq.demo"]._id, providerName: "Community Kitchen", location: { type: "Point", coordinates: [78.478, 17.388] }, demoSeed: true },
    { name: "First Aid Kits", category: "MEDICAL", quantity: 75, unit: "kits", provider: created["ngo@resq.demo"]._id, providerName: "City Volunteers", location: { type: "Point", coordinates: [78.491, 17.38] }, demoSeed: true }
  ]);
  const disaster = await Disaster.findOneAndUpdate(
    { name: "Hyderabad Flood Response" },
    { $set: { name: "Hyderabad Flood Response", type: "FLOOD", severity: "CRITICAL", summary: "Coordinated response across flood-affected zones.", affectedPeople: 320, status: "ACTIVE", location: { type: "Point", coordinates: [78.4867, 17.385] } } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const reports = [
    { title: "Family trapped by rising water", description: "Six people are trapped on the first floor and need rescue immediately.", requestType: "RESCUE", peopleCount: 6, location: [78.482, 17.387] },
    { title: "Medical help needed", description: "Two injured people need first aid and medical support.", requestType: "MEDICAL", peopleCount: 2, location: [78.488, 17.383] },
    { title: "Drinking water required", description: "Residents need drinking water after the local supply was disrupted.", requestType: "WATER", peopleCount: 12, location: [78.477, 17.391] }
  ];
  for (const report of reports) {
    const intelligence = analyzeEmergency({ ...report, disasterType: "FLOOD", priority: "MEDIUM" });
    let embedding = null;
    try { embedding = await embedText(emergencyText({ ...report, disasterType: "FLOOD", intelligence })); } catch (embeddingError) { console.warn("Demo embedding skipped:", embeddingError.message); }
    await EmergencyRequest.create({ ...report, disasterType: "FLOOD", priority: intelligence.recommendedPriority, location: { type: "Point", coordinates: report.location }, reporterName: "Demo Citizen", reporterPhone: "9000000099", reporterToken: `demo-${Date.now()}-${Math.random().toString(16).slice(2)}`, intelligence: { ...intelligence, analyzedAt: new Date() }, embedding: embedding || undefined, demoSeed: true });
  }
  console.log("RESQ demo data seeded.");
  console.log("Authority: authority@resq.demo / resq-demo-123");
  console.log("NGO: ngo@resq.demo / resq-demo-123");
  console.log("Volunteer: aarav@resq.demo / resq-demo-123");
  process.exit(0);
};
run().catch(err => { console.error(err); process.exit(1); });
