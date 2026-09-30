import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock3,
  LifeBuoy,
  LogIn,
  MapPin,
  Radio,
  ShieldCheck,
  Siren,
  Users
} from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";
import EmergencyForm from "../components/citizen/EmergencyForm";
import CitizenRequestCard from "../components/citizen/CitizenRequestCard";
import "./CitizenDashboard.css";
import useCitizenSocket from "../hooks/useCitizenSocket";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function CitizenDashboard() {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [realtime, setRealtime] = useState(false);
  const [notice, setNotice] = useState(null);
  const [shelters, setShelters] = useState([]);
  const [booking, setBooking] = useState(null);
  const [responderLocations, setResponderLocations] = useState({});
  const [reporterToken, setReporterToken] = useState(() => localStorage.getItem("resqReporterToken"));

  const loadRequests = useCallback(async () => {
    const token = localStorage.getItem("resqReporterToken");
    if (!token) {
      setRequests([]);
      return;
    }

    try {
      setLoading(true);
      const res = await axios.get(`${API}/requests/public`, { params: { token } });
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error("Failed to load public reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShelters = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/shelters`);
      setShelters(res.data || []);
    } catch (err) {
      console.error("Failed to load shelters:", err);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
    void loadShelters();
  }, [loadRequests, loadShelters]);

  useCitizenSocket({
    reporterToken,
    onUpdate: loadRequests,
    onNotification: setNotice,
    onConnectionChange: setRealtime,
    onResponderLocation: data => {
      if (!data?.requestId || !Array.isArray(data.coordinates)) return;
      setResponderLocations(current => ({ ...current, [data.requestId]: data }));
    }
  });

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  const active = requests.filter(request => !["RESOLVED", "CANCELLED"].includes(request.status)).length;
  const inProgress = requests.filter(request => request.status === "IN_PROGRESS").length;
  const resolved = requests.filter(request => request.status === "RESOLVED").length;

  const handleCreated = request => {
    if (request?.reporterToken) {
      localStorage.setItem("resqReporterToken", request.reporterToken);
      setReporterToken(request.reporterToken);
    }
    setNotice({
      title: "Report received",
      message: `RESQ case ${String(request?._id || "").slice(-6).toUpperCase()} is now in the response queue.`,
      tone: "assigned"
    });
    void loadRequests();
  };

  const reserveShelter = async shelter => {
    const available = Math.max(0, shelter.capacity - shelter.occupied);
    const raw = window.prompt(`How many people should be placed at ${shelter.name}? Available: ${available}`, "1");
    if (raw === null) return;

    const peopleCount = Number(raw);
    if (!Number.isInteger(peopleCount) || peopleCount <= 0 || peopleCount > available) {
      alert(`Enter a whole number between 1 and ${available}`);
      return;
    }

    try {
      setBooking(shelter._id);
      await axios.post(`${API}/shelters/${shelter._id}/reserve`, { peopleCount });
      await loadShelters();
      setNotice({
        title: "Shelter space reserved",
        message: `${peopleCount} place${peopleCount === 1 ? "" : "s"} reserved at ${shelter.name}.`,
        tone: "resolved"
      });
    } catch (err) {
      alert(err.response?.data?.message || "Unable to reserve shelter space");
    } finally {
      setBooking(null);
    }
  };

  return (
    <div className="citizen-page">
      {notice && (
        <div className={`citizen-toast ${notice.tone}`}>
          <div className="citizen-toast-indicator" />
          <div><strong>{notice.title}</strong><span>{notice.message}</span></div>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <header className="citizen-topbar">
        <Link className="citizen-brand" to="/" aria-label="RESQ home">
          <div className="citizen-brand-mark"><ShieldCheck size={21} /></div>
          <div><h1>RESQ</h1><span>REAL-TIME DISASTER RESPONSE</span></div>
        </Link>

        <div className="citizen-top-actions">
          <div className={`citizen-live ${realtime ? "online" : "offline"}`}><span /> <Radio size={13} /> {realtime ? "NETWORK LIVE" : "CONNECTING"}</div>
          <Link className="citizen-responder-link" to="/track"><Radio size={15} /> Track a report</Link><Link className="citizen-responder-link" to="/login"><LogIn size={15} /> Responder access</Link>
        </div>
      </header>

      <main className="citizen-main">
        <section className="citizen-hero">
          <div className="citizen-hero-copy">
            <div className="citizen-hero-kicker"><span className="hero-pulse" /> PUBLIC EMERGENCY ACCESS</div>
            <h2>Need help? <em>Start here.</em></h2>
            <p>No account. No waiting. Report an emergency with your location and RESQ routes it to the response network.</p>
            <div className="citizen-hero-actions">
              <button className="citizen-report-button citizen-report-primary" onClick={() => setShowForm(true)}><Siren size={19} /> Report an emergency <ArrowRight size={17} /></button>
              <span className="citizen-privacy"><ShieldCheck size={15} /> Location shared only with response operations</span>
            </div>
          </div>
          <div className="citizen-hero-visual">
            <div className="hero-ring ring-one" />
            <div className="hero-ring ring-two" />
            <div className="hero-signal"><Siren size={27} /><span>HELP REQUEST</span><strong>LIVE</strong></div>
            <div className="hero-card hero-card-top"><MapPin size={15} /><span>GPS LOCATION</span><strong>READY</strong></div>
            <div className="hero-card hero-card-bottom"><Users size={15} /><span>RESPONSE NETWORK</span><strong>ACTIVE</strong></div>
          </div>
        </section>

        <section className="citizen-trust-row">
          <div><span className="trust-icon"><Clock3 size={16} /></span><div><strong>Fast reporting</strong><span>Built for stressful moments</span></div></div>
          <div><span className="trust-icon"><MapPin size={16} /></span><div><strong>Precise location</strong><span>GPS attached to every report</span></div></div>
          <div><span className="trust-icon"><LifeBuoy size={16} /></span><div><strong>Live response</strong><span>Track your case after submission</span></div></div>
        </section>

        <section className="citizen-stats">
          <CitizenStat icon={<AlertTriangle />} label="Active reports" value={active} />
          <CitizenStat icon={<Clock3 />} label="In response" value={inProgress} />
          <CitizenStat icon={<CheckCircle />} label="Resolved" value={resolved} />
        </section>

        <section className="citizen-requests">
          <div className="citizen-section-header">
            <div><span className="card-label">YOUR RESPONSE TRACKER</span><h3>Emergency reports</h3></div>
            <span className="count">{requests.length}</span>
          </div>
          {!reporterToken ? (
            <div className="citizen-empty citizen-empty-soft"><div className="empty-icon"><Radio size={22} /></div><h3>No active report yet</h3><p>Once you submit an emergency, this panel becomes your live case tracker.</p><button type="button" className="citizen-empty-action" onClick={() => setShowForm(true)}><Siren size={15} /> Report now</button></div>
          ) : loading ? (
            <div className="citizen-empty">Loading your response status...</div>
          ) : requests.length === 0 ? (
            <div className="citizen-empty">No reports found for this device.</div>
          ) : (
            <div className="citizen-request-list">
              {requests.map(request => <CitizenRequestCard key={request._id} request={request} responderLocation={responderLocations[request._id]} />)}
            </div>
          )}
        </section>

        <section className="citizen-shelters">
          <div className="citizen-section-header"><div><span className="card-label">SAFE LOCATIONS</span><h3>Available shelters</h3></div><span className="count">{shelters.length}</span></div>
          {shelters.length === 0 ? <div className="citizen-empty"><MapPin size={30} /><p>No active shelters are currently listed.</p></div> : <div className="citizen-shelter-list">{shelters.map(shelter => { const available = Math.max(0, shelter.capacity - shelter.occupied); return <div className="citizen-shelter-card" key={shelter._id}><div><div className="citizen-shelter-top"><strong>{shelter.name}</strong><span>{available} spots</span></div><p>{shelter.address || "Response-zone shelter"}</p><small>Capacity {shelter.capacity} · Occupied {shelter.occupied}</small></div><div className="citizen-shelter-actions">{shelter.contact && <span>{shelter.contact}</span>}<button type="button" onClick={() => reserveShelter(shelter)} disabled={available === 0 || booking === shelter._id}>{booking === shelter._id ? "Reserving..." : "Reserve space"}</button></div></div>; })}</div>}
        </section>

        <footer className="citizen-footer">
          <div><ShieldCheck size={17} /><strong>RESQ</strong><span>Real-time disaster response network</span></div>
          <span>Responders need accounts. Citizens do not.</span>
        </footer>
      </main>

      {showForm && <EmergencyForm onClose={() => setShowForm(false)} onCreated={handleCreated} />}
    </div>
  );
}

function CitizenStat({ icon, label, value }) {
  return <div className="citizen-stat"><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>;
}

export default CitizenDashboard;
