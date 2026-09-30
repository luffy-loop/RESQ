# RESQ Response Intelligence

RESQ uses an explainable response-intelligence layer to turn an emergency report into an operational recommendation.

It combines people affected, request type, disaster type, urgency keywords, and requested priority to produce a response score, recommended priority, required resources, recommended responder skills, and an explanation.

The recommendation is stored with the emergency request and feeds nearby responder matching.

The implementation is intentionally explainable and deterministic for the hackathon demo. An external embedding provider can be enabled through the embedding environment variables for Atlas Vector Search.
