const PRIORITY_SCORE = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 95 };

const keywordScore = (text = "") => {
  const value = text.toLowerCase();
  let score = 0;
  if (/trapped|stranded|unconscious|bleeding|injured|collapse|collapsed|fire|missing/.test(value)) score += 30;
  if (/urgent|immediately|critical|emergency|danger/.test(value)) score += 20;
  if (/child|children|elderly|pregnant|disabled/.test(value)) score += 10;
  return Math.min(score, 60);
};

const analyzeEmergency = input => {
  const requestType = String(input.requestType || "OTHER").toUpperCase();
  const disasterType = String(input.disasterType || "OTHER").toUpperCase();
  const peopleCount = Math.max(1, Number(input.peopleCount) || 1);
  const text = `${input.title || ""} ${input.description || ""}`;

  let score = PRIORITY_SCORE[input.priority] || 50;
  score += keywordScore(text);
  if (peopleCount >= 10) score += 25;
  else if (peopleCount >= 5) score += 15;
  else if (peopleCount >= 3) score += 8;

  if (requestType === "RESCUE") score += 18;
  if (requestType === "MEDICAL") score += 15;
  if (["EARTHQUAKE", "CYCLONE", "FLOOD"].includes(disasterType)) score += 5;

  score = Math.min(100, score);
  const recommendedPriority = score >= 90 ? "CRITICAL" : score >= 70 ? "HIGH" : score >= 45 ? "MEDIUM" : "LOW";

  const resources = new Set();
  const skills = new Set();
  const add = (...items) => items.forEach(item => resources.add(item));

  if (requestType === "RESCUE") { add("Rescue team", "Transport"); skills.add("RESCUE"); }
  if (requestType === "MEDICAL") { add("Medical support", "First-aid kit"); skills.add("MEDICAL"); }
  if (requestType === "FOOD") { add("Food packets"); skills.add("FOOD"); }
  if (requestType === "WATER") { add("Drinking water"); skills.add("WATER"); }
  if (requestType === "SHELTER") { add("Shelter space"); skills.add("SHELTER"); }
  if (requestType === "CLOTHING") { add("Clothing kits"); skills.add("CLOTHING"); }
  if (requestType === "OTHER") { add("General relief support"); }
  if (peopleCount >= 5) add("Additional responders");
  if (["FLOOD", "CYCLONE"].includes(disasterType)) add("Water rescue equipment");
  if (disasterType === "EARTHQUAKE") add("Search and rescue equipment");

  return {
    score,
    recommendedPriority,
    requiredResources: [...resources],
    recommendedSkills: [...skills],
    reasoning: `Priority ${recommendedPriority.toLowerCase()} based on ${peopleCount} affected person(s), ${requestType.toLowerCase()} need, disaster context, and urgency signals in the report.`
  };
};

module.exports = { analyzeEmergency };
