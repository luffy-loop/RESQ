# RESQ Response Intelligence

RESQ uses an explainable response-intelligence layer to turn an emergency report into an operational recommendation.

It combines people affected, request type, disaster type, urgency keywords, and requested priority to produce a response score, recommended priority, required resources, recommended responder skills, and an explanation.

The recommendation is stored with the emergency request and feeds nearby responder matching. Matching ranks available responders using specialist-skill fit and geospatial proximity, then stores the selected responder, match score, distance, ETA estimate, reasoning and a Google Maps navigation route. ETA is an operational estimate based on straight-line distance, a disaster-specific response speed and a road-distance factor; Google Maps is used for the actual navigation route.

The implementation is intentionally explainable and deterministic for the hackathon demo. An external embedding provider can be enabled through the embedding environment variables for Atlas Vector Search.
