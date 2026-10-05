# RESQ Response Intelligence

RESQ uses an explainable response-intelligence layer to turn an emergency report into an operational recommendation.

It combines people affected, request type, disaster type, urgency keywords, and requested priority to produce a response score, recommended priority, required resources, recommended responder skills, and an explanation.

The recommendation is stored with the emergency request and feeds nearby responder matching. Matching ranks available responders using specialist-skill fit and geospatial proximity, then stores the selected responder, match score, distance, ETA estimate, reasoning and a Google Maps navigation route. ETA is an operational estimate based on straight-line distance, a disaster-specific response speed and a road-distance factor; Google Maps is used for the actual navigation route.

## Automatic escalation

After assignment, RESQ starts an acceptance timer based on priority: Critical 2 minutes, High 5 minutes, Medium 10 minutes and Low 15 minutes. If the responder has not accepted when the timer expires, the server atomically releases the assignment, records the responder and reason in escalation history, and searches for a different available responder. The command center receives an `emergency-escalated` Socket.IO event and shows the escalation count and reason. Escalated responders are excluded from subsequent matching for that request.

The implementation is intentionally explainable and deterministic for the hackathon demo. An external embedding provider can be enabled through the embedding environment variables for Atlas Vector Search.
