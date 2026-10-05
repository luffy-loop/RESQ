# RESQ — Real-Time Disaster Response Network

RESQ is a disaster-relief coordination platform for floods, earthquakes, cyclones and other emergencies. It connects affected communities, volunteers, NGOs and authorities through one live operational network.

## Core response flow

**Citizen → Emergency Report → GPS → Command Center → Volunteer/NGO → Live Response → Resolution**

Citizens can report without creating an account. Responders use authenticated accounts.

## What is implemented

- Public emergency reporting with GPS and private case token
- Disaster/incident activation for Flood, Earthquake, Cyclone, Fire, Landslide and Other
- Authority command center with live map
- Priority emergency queue and automatic volunteer assignment
- Smart responder matching with skill fit, distance, match score and estimated ETA
- One-click live Google Maps navigation route for the assigned responder
- Automatic escalation when an assigned responder does not accept within the priority response window
- Escalation history, reassignment to a different available responder, and live escalation alerts
- Response timers for Critical, High, Medium and Low assignments
- Volunteer dashboard with accept/start/resolve workflow
- Volunteer availability and live GPS sharing
- Anonymous citizen live status and responder location
- Public report tracking by private token
- Shelter inventory and capacity reservation
- NGO resource registration and supply commitment
- MongoDB models and geospatial indexes for emergency/resource coordination
- Socket.IO live operational events

## Roles

- **Citizen:** report and track an emergency without login
- **Volunteer:** receive/accept/respond/resolve emergencies
- **NGO:** register supplies and commit resources to community requests
- **Authority:** activate incidents and coordinate the whole response network

## Stack

Frontend: React + Vite + MapLibre + Socket.IO client
Backend: Node.js + Express + Socket.IO
Database: MongoDB Atlas + Mongoose + geospatial indexes
Infrastructure: Vite dev server + Node API

## Run

Frontend:

```powershell
npm install
npm run dev
```

Backend:

```powershell
cd backend
npm install
npm start
```

## Escalation policy

Assigned requests have an acceptance window based on priority: Critical 2 minutes, High 5 minutes, Medium 10 minutes and Low 15 minutes. If the assigned responder does not accept before the window expires, RESQ releases that responder, records the escalation, and searches for a different available responder. Previously escalated responders are excluded from the next match. If no alternative responder is available, the request returns to the pending queue.

Backend `.env`:

```env
MONGO_URI=your_mongodb_atlas_uri
PORT=5001
JWT_SECRET=your_long_secret
RESQ_ESCALATION_INTERVAL_MS=30000
```

Frontend `.env`:

```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

## Demo order

1. Open `/` and report an emergency without logging in.
2. Copy the private case token from the response flow or use `/track`.
3. Log in as an authority at `/login` and open the command center.
4. Activate a disaster incident and watch the request appear in the live queue.
5. Log in as a volunteer in another browser/session and accept or receive the request.
6. Share volunteer GPS and show the command center/citizen live location update.
7. Move the volunteer response through Assigned → In Progress → Resolved.
8. Log in as an NGO and register/commit supplies.
9. Show shelter capacity and resource inventory on the command center.


## Demo setup

From `backend/`, run `npm run seed` to create a realistic Hyderabad response dataset and demo accounts.

The emergency workflow includes an explainable Response Intelligence layer that scores urgency, recommends priority/resources, and feeds responder matching. See `docs/ResponseIntelligence.md`.
