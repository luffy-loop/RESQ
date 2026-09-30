import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { Activity, AlertTriangle, Building2, CheckCircle2, ChevronRight, Clock3, LogOut, MapPin, Package, Radio, ShieldCheck, Siren, Users, X } from "lucide-react";
import { Link } from "react-router-dom";
import Map from "./Map";
import "./CommandCenter.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const SOCKET = import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

function App() {
  const [requests, setRequests] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [supplies, setSupplies] = useState([]);
  const [disaster, setDisaster] = useState(null);
  const [liveLocations, setLiveLocations] = useState({});
  const [loading, setLoading] = useState(true);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [toast, setToast] = useState("");

  const load = useCallback(async () => {
    try {
      const [r, v, s, p, d] = await Promise.all([
        axios.get(`${API}/requests`), axios.get(`${API}/volunteers`), axios.get(`${API}/shelters`), axios.get(`${API}/supplies`), axios.get(`${API}/disasters/active`)
      ]);
      setRequests(r.data.requests || []); setVolunteers(v.data || []); setShelters(s.data || []); setSupplies(p.data || []); setDisaster(d.data.disaster || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const socket = io(SOCKET, { transports: ["polling"] });
    socket.on("connect", () => socket.emit("join-command-center"));
    ["emergency-created", "emergency-updated", "supply-created", "supply-updated", "shelter-updated", "disaster-updated"].forEach(event => socket.on(event, load));
    socket.on("volunteer-location", data => { if (data?.volunteerId && Array.isArray(data.coordinates)) setLiveLocations(current => ({ ...current, [data.volunteerId]: data.coordinates })); });
    return () => socket.disconnect();
  }, [load]);

  const assign = async id => {
    try { setAssigning(id); await axios.post(`${API}/requests/${id}/auto-assign`); await load(); setToast("Volunteer assigned and notified."); }
    catch (err) { setToast(err.response?.data?.message || "No suitable volunteer is available."); }
    finally { setAssigning(null); }
  };

  const active = requests.filter(r => !["RESOLVED", "CANCELLED"].includes(r.status));
  const critical = active.filter(r => r.priority === "CRITICAL").length;
  const availableVolunteers = volunteers.filter(v => v.available).length;
  const capacity = shelters.reduce((sum, item) => sum + Math.max(0, item.capacity - item.occupied), 0);
  const resourceUnits = supplies.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 3500); return () => clearTimeout(t); }, [toast]);

  const logout = () => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/login"; };

  return <div className="cc-page">
    {toast && <div className="cc-toast"><span>{toast}</span><button onClick={() => setToast("")}><X size={15}/></button></div>}
    <aside className="cc-sidebar">
      <Link to="/" className="cc-brand"><span><ShieldCheck size={21}/></span><div><strong>RESQ</strong><small>COMMAND NETWORK</small></div></Link>
      <div className="cc-nav"><small>OPERATIONS</small><a className="active"><Activity size={16}/> Overview</a><a href="#requests"><Siren size={16}/> Emergencies <b>{active.length}</b></a><a href="#volunteers"><Users size={16}/> Volunteers <b>{availableVolunteers}</b></a><a href="#shelters"><Building2 size={16}/> Shelters</a><a href="#supplies"><Package size={16}/> Supplies</a></div>
      <div className="cc-side-bottom"><div className="cc-system"><i/> <div><strong>Network operational</strong><small>MongoDB response data live</small></div></div><button onClick={logout}><LogOut size={15}/> Sign out</button></div>
    </aside>
    <main className="cc-main">
      <header className="cc-header"><div><span>DISASTER RESPONSE / CONTROL ROOM</span><h1>Operations command center</h1></div><div className="cc-head-actions"><span className="cc-live"><i/> LIVE</span><button onClick={() => setIncidentOpen(true)}><AlertTriangle size={15}/> {disaster ? "Update incident" : "Activate incident"}</button></div></header>
      <section className="cc-incident"><div><small>ACTIVE INCIDENT</small><h2>{disaster?.name || "No incident activated"}</h2><p>{disaster?.summary || "Create an incident to coordinate the response zone."}</p></div><div className="cc-incident-meta"><span>{disaster?.type || "—"}</span><strong>{disaster?.severity || "STANDBY"}</strong></div></section>
      <section className="cc-stats"><Stat icon={<AlertTriangle/>} label="Critical" value={critical}/><Stat icon={<Activity/>} label="Active requests" value={active.length}/><Stat icon={<Users/>} label="Available responders" value={`${availableVolunteers}/${volunteers.length}`}/><Stat icon={<Building2/>} label="Shelter spaces" value={capacity}/><Stat icon={<Package/>} label="Resource units" value={resourceUnits}/></section>
      <section className="cc-grid">
        <div className="cc-card cc-map-card"><Head label="LIVE RESPONSE MAP" title="Field activity"/><Map requests={requests} volunteers={volunteers} shelters={shelters} supplies={supplies} liveLocations={liveLocations}/><div className="cc-legend"><span><i className="emergency"/> Emergencies</span><span><i className="volunteer"/> Volunteers</span><span><i className="shelter"/> Shelters</span><span><i className="supply"/> Supplies</span></div></div>
        <div className="cc-card" id="requests"><Head label="PRIORITY QUEUE" title="Emergency requests" count={active.length}/><div className="cc-request-list">{loading ? <Empty text="Loading response queue..."/> : active.length === 0 ? <Empty text="No active emergencies."/> : active.map(request => <Request key={request._id} request={request} assigning={assigning === request._id} onAssign={assign} />)}</div></div>
      </section>
      <section className="cc-resource-grid" id="volunteers"><Resource title="Responder readiness" icon={<Users/>}>{volunteers.slice(0,8).map(v => <div className="cc-row" key={v._id}><span className={`cc-dot ${v.available ? "good" : "busy"}`}/><div><strong>{v.name}</strong><small>{v.skills?.join(" · ") || "General responder"}</small></div><b>{v.available ? "AVAILABLE" : "ON RESPONSE"}</b></div>)}</Resource><Resource title="Shelter capacity" icon={<Building2/>}>{shelters.slice(0,6).map(s => <div className="cc-row" key={s._id}><span className="cc-icon"><MapPin size={14}/></span><div><strong>{s.name}</strong><small>{s.address || "Response-zone shelter"}</small></div><b>{Math.max(0,s.capacity-s.occupied)} FREE</b></div>)}</Resource><Resource title="Resource inventory" icon={<Package/>}>{supplies.slice(0,6).map(s => <div className="cc-row" key={s._id}><span className="cc-icon"><Package size={14}/></span><div><strong>{s.name}</strong><small>{s.providerName} · {s.category}</small></div><b>{s.quantity} {s.unit}</b></div>)}</Resource></section>
    </main>
    {incidentOpen && <IncidentModal current={disaster} onClose={() => setIncidentOpen(false)} onSaved={async () => { setIncidentOpen(false); await load(); }}/>} 
  </div>;
}

function Stat({icon,label,value}){return <div className="cc-stat"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>}
function Head({label,title,count}){return <div className="cc-card-head"><div><small>{label}</small><h2>{title}</h2></div>{count !== undefined && <b>{count}</b>}</div>}
function Empty({text}){return <div className="cc-empty"><Clock3 size={19}/><span>{text}</span></div>}
function Request({request,assigning,onAssign}){const assigned=Boolean(request.assignedVolunteer);return <article className="cc-request"><div className="cc-request-top"><span className={`priority ${request.priority.toLowerCase()}`}>{request.priority}</span><small>{request.requestType} · {new Date(request.createdAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div><h3>{request.title}</h3><p>{request.description || "No additional details provided."}</p><div className="cc-request-bottom"><span>{request.peopleCount || 1} people · {request.status.replaceAll("_"," ")}</span>{assigned ? <strong><Users size={13}/> {request.assignedVolunteer.name}</strong> : <button onClick={() => onAssign(request._id)} disabled={assigning}>{assigning ? "Assigning..." : "Auto assign"}<ChevronRight size={14}/></button>}</div></article>}
function Resource({title,icon,children}){return <div className="cc-card cc-resource"><div className="cc-resource-head"><span>{icon}</span><h2>{title}</h2></div><div>{children}</div></div>}
function IncidentModal({current,onClose,onSaved}){const [form,setForm]=useState({name:current?.name||"Hyderabad Flood Response",type:current?.type||"FLOOD",severity:current?.severity||"CRITICAL",summary:current?.summary||"Coordinated response across affected zones.",affectedPeople:current?.affectedPeople||0,longitude:current?.location?.coordinates?.[0]||78.4867,latitude:current?.location?.coordinates?.[1]||17.385});const update=e=>setForm({...form,[e.target.name]:e.target.value});const save=async e=>{e.preventDefault();try{await axios.post(`${API}/disasters`,{...form,affectedPeople:Number(form.affectedPeople),location:{type:"Point",coordinates:[Number(form.longitude),Number(form.latitude)]}});await onSaved();}catch(err){alert(err.response?.data?.message||"Unable to activate incident");}};return <div className="cc-modal-wrap"><form className="cc-modal" onSubmit={save}><button type="button" className="cc-modal-close" onClick={onClose}><X size={18}/></button><small>INCIDENT CONTROL</small><h2>Activate response operation</h2><label>Incident name<input name="name" value={form.name} onChange={update} required/></label><div className="cc-two"><label>Disaster type<select name="type" value={form.type} onChange={update}>{["FLOOD","EARTHQUAKE","CYCLONE","FIRE","LANDSLIDE","OTHER"].map(x=><option key={x}>{x}</option>)}</select></label><label>Severity<select name="severity" value={form.severity} onChange={update}>{["CRITICAL","HIGH","MEDIUM","LOW"].map(x=><option key={x}>{x}</option>)}</select></label></div><label>Situation summary<textarea name="summary" value={form.summary} onChange={update} rows="3"/></label><label>Affected people<input type="number" min="0" name="affectedPeople" value={form.affectedPeople} onChange={update}/></label><button className="cc-modal-save">Activate incident</button></form></div>}

export default App;
