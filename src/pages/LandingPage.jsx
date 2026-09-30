import { ArrowRight, Building2, CheckCircle2, LifeBuoy, LogIn, Map, ShieldCheck, Siren, Users } from "lucide-react";
import { Link } from "react-router-dom";
import "./LandingPage.css";

const roles = [
  { key: "CITIZEN", title: "Affected Person", text: "Report an emergency, share your location and track the response.", icon: Siren, href: "/citizen", action: "Report an emergency" },
  { key: "VOLUNTEER", title: "Volunteer", text: "Receive nearby assignments and coordinate field response.", icon: Users, href: "/login?role=VOLUNTEER", action: "Volunteer access" },
  { key: "NGO", title: "NGO / Relief Organization", text: "Coordinate supplies, shelters and community support.", icon: Building2, href: "/login?role=NGO", action: "NGO access" },
  { key: "AUTHORITY", title: "Authority", text: "Monitor incidents, responders and resources from command.", icon: ShieldCheck, href: "/login?role=AUTHORITY", action: "Command access" }
];

function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link to="/" className="landing-brand"><span><ShieldCheck size={21} /></span><div><strong>RESQ</strong><small>REAL-TIME DISASTER RESPONSE</small></div></Link>
        <div className="landing-header-actions"><Link to="/track">Track a report</Link><Link className="landing-login" to="/login"><LogIn size={15} /> Sign in</Link></div>
      </header>
      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <span className="landing-kicker"><i /> DISASTER RESPONSE NETWORK</span>
            <h1>Coordinate.<br /><em>Respond.</em><br />Recover.</h1>
            <p>One shared response system connecting affected people, volunteers, NGOs and authorities when every minute matters.</p>
            <div className="landing-actions"><Link className="landing-primary" to="/citizen"><Siren size={17} /> Report an emergency <ArrowRight size={16} /></Link><Link className="landing-secondary" to="/login">Join the response network</Link></div>
          </div>
          <div className="landing-command-visual">
            <div className="landing-grid-lines" /><div className="landing-map-orbit orbit-one" /><div className="landing-map-orbit orbit-two" />
            <div className="landing-center"><Map size={30} /><span>LIVE RESPONSE</span><strong>NETWORK</strong></div>
            <div className="landing-signal signal-red"><i /><span>NEEDS HELP</span></div><div className="landing-signal signal-green"><i /><span>RESOLVED</span></div><div className="landing-signal signal-blue"><i /><span>VOLUNTEER</span></div>
          </div>
        </section>
        <section className="landing-trust"><div><LifeBuoy size={17} /><span>Public emergency access</span></div><div><Map size={17} /><span>Location-aware coordination</span></div><div><CheckCircle2 size={17} /><span>Live response status</span></div><div><ShieldCheck size={17} /><span>Role-based workspaces</span></div></section>
        <section className="landing-roles">
          <div className="landing-section-head"><div><span>HOW ARE YOU JOINING THE RESPONSE?</span><h2>One platform. Four operational views.</h2></div><p>Choose your role to enter the workspace built for your part of the response.</p></div>
          <div className="landing-role-grid">{roles.map(role => { const Icon = role.icon; return <Link className={`landing-role landing-role-${role.key.toLowerCase()}`} to={role.href} key={role.key}><span className="landing-role-icon"><Icon size={20} /></span><small>{role.key === "CITIZEN" ? "PUBLIC ACCESS" : "ACCOUNT WORKSPACE"}</small><h3>{role.title}</h3><p>{role.text}</p><strong>{role.action} <ArrowRight size={14} /></strong></Link>; })}</div>
        </section>
        <section className="landing-flow"><div><span>SHARED RESPONSE WORKFLOW</span><h2>From request to resolution.</h2></div><div className="landing-flow-steps">{["Request", "Prioritize", "Match", "Assign", "Respond", "Resolve"].map((step, index) => <div key={step}><b>0{index + 1}</b><span>{step}</span>{index < 5 && <i />}</div>)}</div></section>
      </main>
      <footer className="landing-footer"><span>RESQ / DISASTER RESPONSE NETWORK</span><span>One shared response system</span></footer>
    </div>
  );
}
export default LandingPage;
