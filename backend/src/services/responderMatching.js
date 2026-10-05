const User = require("../models/User");

const haversineKm = (a, b) => {
  const [lng1, lat1] = a.map(Number);
  const [lng2, lat2] = b.map(Number);
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const SPEEDS = {
  FLOOD: 18,
  EARTHQUAKE: 22,
  CYCLONE: 25,
  FIRE: 28,
  LANDSLIDE: 20,
  OTHER: 30
};

const buildResponderAssignment = (request, volunteer, prefix = "Selected") => {
  const vc = volunteer.location?.coordinates, rc = request.location?.coordinates;
  if (!Array.isArray(vc) || vc.length !== 2 || !Array.isArray(rc) || rc.length !== 2) return null;
  const skills = request.intelligence?.recommendedSkills?.length ? request.intelligence.recommendedSkills.map(skill => String(skill).toUpperCase()) : [String(request.requestType || "OTHER").toUpperCase()];
  const vs = (volunteer.skills || []).map(skill => String(skill).toUpperCase());
  const matchedSkills = skills.filter(skill => vs.includes(skill));
  const distanceKm = haversineKm(vc, rc);
  const skillScore = skills.length ? Math.round((matchedSkills.length / skills.length) * 45) : 0;
  const distanceScore = Math.max(0, Math.round(40 - distanceKm * 2));
  const matchScore = Math.min(100, skillScore + distanceScore + (volunteer.available ? 15 : 0));
  const speedKmh = SPEEDS[String(request.disasterType || "OTHER").toUpperCase()] || SPEEDS.OTHER;
  const etaMinutes = Math.max(1, Math.ceil((distanceKm * 1.35 / speedKmh) * 60));
  const reasons = matchedSkills.length ? ["matches " + matchedSkills.join(", ") + " skill" + (matchedSkills.length > 1 ? "s" : "")] : ["no specialist match available"];
  reasons.push(distanceKm.toFixed(1) + " km away");
  if (volunteer.available) reasons.push("currently available");
  return { matchScore, distanceKm: Number(distanceKm.toFixed(2)), etaMinutes, matchedSkills, reasoning: prefix + " because the responder " + reasons.join(", ") + ".", estimatedSpeedKmh: speedKmh, estimatedAt: new Date(), routeUrl: "https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(rc[1] + "," + rc[0]) + "&travelmode=driving&dir_action=navigate" };
};

const findBestResponder = async (request, excludedVolunteerIds = []) => {
  const skills = request.intelligence?.recommendedSkills?.length
    ? request.intelligence.recommendedSkills.map(skill => skill.toUpperCase())
    : [String(request.requestType || "OTHER").toUpperCase()];

  const excluded = excludedVolunteerIds.map(id => String(id)).filter(Boolean);
  const candidates = await User.find({
    role: "VOLUNTEER",
    available: true,
    ...(excluded.length ? { _id: { $nin: excluded } } : {}),
    location: {
      $near: {
        $geometry: request.location,
        $maxDistance: 30000
      }
    }
  }).select("name phone skills location").limit(30);

  if (!candidates.length) return null;

  const ranked = candidates.map(volunteer => {
    const assignment = buildResponderAssignment(request, volunteer);
    return assignment ? { volunteer, assignment } : null;
  }).filter(Boolean);
  ranked.sort((a, b) => b.assignment.matchScore - a.assignment.matchScore || a.assignment.distanceKm - b.assignment.distanceKm);
  if (!ranked.length) return null;
  return ranked[0];
};

module.exports = { findBestResponder, buildResponderAssignment };