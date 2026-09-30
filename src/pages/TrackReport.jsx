import { useState } from "react";
import axios from "axios";
import { ArrowLeft, CheckCircle2, Clock3, MapPin, Search, ShieldCheck, Siren, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import "./TrackReport.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const steps = ["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED"];

function TrackReport() {
  const [token, setToken] = useState(localStorage.getItem("resqReporterToken") || "");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  const search = async event => {
    event.preventDefault();
    if (!token.trim()) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API}/requests/public`, { params: { token: token.trim() } });
      setReports(res.data.requests || []);
      setSearched(true);
      localStorage.setItem("resqReporterToken", token.trim());
    } catch (err) {
      setError(err.response?.data?.message || "Unable to find that report.");
      setReports([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="track-page">
      <header className="track-header">
        <Link to="/" className="track-brand"><span><ShieldCheck size={20} /></span><div><strong>RESQ</strong><small>PUBLIC RESPONSE PORTAL</small></div></Link>
        <Link to="/" className="track-back"><ArrowLeft size={15} /> Emergency access</Link>
      </header>

      <main className="track-main">
        <section className="track-intro">
          <span className="track-kicker"><Siren size={14} /> CASE TRACKING</span>
          <h1>Know what happens next.</h1>
          <p>Enter the private case token you received after reporting an emergency. No account is required.</p>
        </section>

        <form className="track-search" onSubmit={search}>
          <label>Private case token<input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste your RESQ case token" /></label>
          <button disabled={loading || !token.trim()}><Search size={17} />{loading ? "Checking..." : "Track report"}</button>
        </form>

        {error && <div className="track-error">{error}</div>}

        {searched && reports.length === 0 && !error && <div className="track-empty"><Search size={25} /><strong>No report found</strong><span>Check the token and try again.</span></div>}

        <div className="track-list">
          {reports.map(report => <Report key={report._id} report={report} />)}
        </div>

        <div className="track-note"><ShieldCheck size={16} /><span>Your token is private. Anyone with the token can view this report, so keep it safe.</span></div>
      </main>
    </div>
  );
}

function Report({ report }) {
  const statusIndex = Math.max(0, steps.indexOf(report.status));
  const label = report.status.replaceAll("_", " ");
  return (
    <article className="track-card">
      <div className="track-card-head">
        <div><span className={`track-priority ${report.priority.toLowerCase()}`}>{report.priority}</span><h2>{report.title}</h2><p>{report.requestType} · {report.peopleCount || 1} people affected</p></div>
        <strong className={`track-status ${report.status.toLowerCase()}`}>{label}</strong>
      </div>
      <div className="track-meta"><span><Clock3 size={14} /> {new Date(report.createdAt).toLocaleString()}</span><span><MapPin size={14} /> GPS attached</span>{report.assignedVolunteer && <span><UserRound size={14} /> {report.assignedVolunteer.name}</span>}</div>
      <div className="track-steps">
        {steps.map((step, index) => <div className={index <= statusIndex ? "done" : ""} key={step}><span>{index < statusIndex ? <CheckCircle2 size={14} /> : index === statusIndex ? <span className="step-dot" /> : index + 1}</span><small>{step.replaceAll("_", " ")}</small></div>)}
      </div>
      {report.assignedVolunteer && <div className="track-responder"><div className="responder-avatar">{report.assignedVolunteer.name?.charAt(0)?.toUpperCase()}</div><div><small>RESPONDER ASSIGNED</small><strong>{report.assignedVolunteer.name}</strong><span>{report.assignedVolunteer.skills?.join(" · ") || "Response team"}</span></div></div>}
    </article>
  );
}

export default TrackReport;
