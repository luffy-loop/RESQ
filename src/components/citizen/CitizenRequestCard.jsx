import { Clock, MapPin, User, CheckCircle, Navigation } from "lucide-react";

function CitizenRequestCard({ request, responderLocation }) {
  const resolved = request.status === "RESOLVED";
  const assigned = Boolean(request.assignedVolunteer);
  const [lng, lat] = request.location?.coordinates || [];
  const volunteerLocation = responderLocation?.coordinates || request.assignedVolunteer?.location?.coordinates;
  const distance = volunteerLocation ? getDistanceKm(lat, lng, volunteerLocation[1], volunteerLocation[0]) : null;
  const responseMessage = { ASSIGNED: "Responder assigned", ACCEPTED: "Responder accepted the emergency", ON_THE_WAY: "Responder is on the way", ARRIVED: "Responder has arrived", IN_PROGRESS: "Emergency is being handled" }[request.status] || "Response update";

  return <div className="citizen-request-card">
    <div className="citizen-request-top"><div className="citizen-request-type"><span className={`priority ${request.priority.toLowerCase()}`}></span>{request.disasterType || "INCIDENT"} · {request.requestType}</div><span className="request-time"><Clock size={13}/>{new Date(request.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</span></div>
    <h3>{request.title}</h3><p>{request.description}</p>
    <div className="citizen-request-status"><span className={`citizen-status ${request.status.toLowerCase()}`}>{request.status.replaceAll("_"," ")}</span></div>
    {request.assignedVolunteer && <div className="citizen-volunteer"><User size={16}/><div><span>RESPONSE VOLUNTEER</span><strong>{request.assignedVolunteer.name}</strong></div></div>}
    {assigned && !resolved && <div className="citizen-live-response"><Navigation size={15}/><div><strong>{responseMessage}</strong><span>{request.status === "IN_PROGRESS" ? "Your emergency is currently being handled." : "Your response status is being updated by the assigned volunteer."}</span>{responderLocation?.timestamp && <span>Live location · {formatAge(responderLocation.timestamp)}</span>}{distance !== null && <b>{distance < 1 ? `${Math.round(distance * 1000)} m away` : `${distance.toFixed(1)} km away`}</b>}{distance !== null && <a className="citizen-responder-map-link" href={`https://www.google.com/maps/dir/?api=1&origin=${volunteerLocation[1]},${volunteerLocation[0]}&destination=${lat},${lng}`} target="_blank" rel="noreferrer">Open responder route <Navigation size={12}/></a>}</div></div>}
    {resolved && <div className="citizen-resolved"><CheckCircle size={16}/> Emergency response completed</div>}
    <div className="citizen-request-location"><MapPin size={14}/>{Number.isFinite(lng) && Number.isFinite(lat) ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "Location unavailable"}</div>
    {Number.isFinite(lng) && Number.isFinite(lat) && <a className="citizen-map-link" href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noreferrer">Open emergency location <Navigation size={13}/></a>}
  </div>;
}
export default CitizenRequestCard;
function formatAge(timestamp) { const seconds=Math.max(0,Math.floor((Date.now()-timestamp)/1000)); if(seconds<5)return "just now"; if(seconds<60)return `${seconds}s ago`; return `${Math.floor(seconds/60)}m ago`; }
function getDistanceKm(a,b,c,d) { const r=6371; const x=(c-a)*Math.PI/180; const y=(d-b)*Math.PI/180; const q=Math.sin(x/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(y/2)**2; return 2*r*Math.atan2(Math.sqrt(q),Math.sqrt(1-q)); }
