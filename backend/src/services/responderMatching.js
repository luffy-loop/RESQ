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

const findBestResponder = async request => {
  const skills = request.intelligence?.recommendedSkills?.length
    ? request.intelligence.recommendedSkills.map(skill => skill.toUpperCase())
    : [String(request.requestType || "OTHER").toUpperCase()];

  const candidates = await User.find({
    role: "VOLUNTEER",
    available: true,
    location: {
      $near: {
        $geometry: request.location,
        $maxDistance: 30000
      }
    }
  }).select("name phone skills location").limit(30);

  if (!candidates.length) return null;

  const disasterType = String(request.disasterType || "OTHER").toUpperCase();
  const speedKmh = SPEEDS[disasterType] || SPEEDS.OTHER;
  const requestCoordinates = request.location.coordinates;

  const ranked = candidates.map(volunteer => {
    const volunteerCoordinates = volunteer.location?.coordinates;
    if (!Array.isArray(volunteerCoordinates) || volunteerCoordinates.length !== 2) return null;

    const distanceKm = haversineKm(volunteerCoordinates, requestCoordinates);
    const volunteerSkills = (volunteer.skills || []).map(skill => String(skill).toUpperCase());
    const matchedSkills = skills.filter(skill => volunteerSkills.includes(skill));
    const skillScore = skills.length ? Math.round((matchedSkills.length / skills.length) * 45) : 0;
    const distanceScore = Math.max(0, Math.round(40 - distanceKm * 2));
    const readinessScore = volunteer.available ? 15 : 0;
    const matchScore = Math.min(100, skillScore + distanceScore + readinessScore);
    const roadFactor = 1.35;
    const etaMinutes = Math.max(1, Math.ceil((distanceKm * roadFactor / speedKmh) * 60));

    const reasons = [];
    if (matchedSkills.length) reasons.push(`matches ${matchedSkills.join(", ")} skill${matchedSkills.length > 1 ? "s" : ""}`);
    else reasons.push("no specialist match available");
    reasons.push(`${distanceKm.toFixed(1)} km away`);
    reasons.push("currently available");

    return {
      volunteer,
      distanceKm,
      etaMinutes,
      matchScore,
      matchedSkills,
      reasons,
      speedKmh
    };
  }).filter(Boolean);

  ranked.sort((a, b) => b.matchScore - a.matchScore || a.distanceKm - b.distanceKm);
  const best = ranked[0];

  return {
    volunteer: best.volunteer,
    assignment: {
      matchScore: best.matchScore,
      distanceKm: Number(best.distanceKm.toFixed(2)),
      etaMinutes: best.etaMinutes,
      matchedSkills: best.matchedSkills,
      reasoning: `Selected because the responder ${best.reasons.join(", ")}.`,
      estimatedSpeedKmh: best.speedKmh,
      estimatedAt: new Date(),
      routeUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(requestCoordinates[1] + "," + requestCoordinates[0])}&travelmode=driving&dir_action=navigate`
    }
  };
};

module.exports = { findBestResponder };