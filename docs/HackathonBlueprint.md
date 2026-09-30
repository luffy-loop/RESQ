# RESQ Hackathon Blueprint

## Problem

During floods, earthquakes, cyclones and other disasters, information about affected people, shelters, volunteers, supplies and requests can become fragmented. RESQ creates a shared operational layer connecting affected communities, volunteers, NGOs and authorities.

## Solution

### Input

- Citizen emergency report
- GPS location
- Disaster type
- Need type
- People affected
- Priority
- Optional contact information
- Volunteer skills/availability
- NGO supplies
- Shelter capacity

### Processing

- Store the emergency in MongoDB
- Geospatially match nearby responders
- Prioritize critical requests
- Route updates through Socket.IO
- Track responder location
- Maintain shelter and supply availability

### Outcome

- Citizens get a case token and live response status
- Volunteers receive actionable assignments
- NGOs can register and commit resources
- Authorities get a live operational picture

## Technology & AI section

The template asks for Technology Stack and AI features. RESQ's implemented data intelligence is the response-priority and geospatial assignment layer. For a presentation, describe this as **AI-ready Response Intelligence** unless an external AI/ML model is actually connected.

Do not claim a generative AI model or vector search is deployed unless the team connects and tests one. The MongoDB data model is already structured for future semantic resource/incident retrieval with embeddings and Atlas Vector Search.

## MongoDB value

Collections:

- users
- emergencyrequests
- shelters
- supplies
- disasters

Indexes include 2dsphere indexes for location-aware response operations and operational indexes for status/priority queues.

## End-to-end demo

Citizen reports → MongoDB stores → Authority sees live queue → Auto/manual volunteer assignment → Volunteer responds → GPS updates stream → NGO supplies are committed → Shelter capacity is updated → Emergency resolves.
