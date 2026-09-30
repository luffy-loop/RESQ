const embedText = async text => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(process.env.EMBEDDING_API_URL || "https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: process.env.EMBEDDING_MODEL || "text-embedding-3-small", input: text })
  });
  if (!response.ok) throw new Error(`Embedding service failed: ${response.status}`);
  const data = await response.json();
  return data.data?.[0]?.embedding || null;
};

const emergencyText = request => [request.disasterType, request.requestType, request.title, request.description, ...(request.intelligence?.requiredResources || [])].filter(Boolean).join(" | ");

module.exports = { embedText, emergencyText };
