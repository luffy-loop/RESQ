import { useEffect, useState } from "react";
import axios from "axios";
import { Building2, LogIn, Shield, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Login.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const roles = [
  { key: "VOLUNTEER", label: "Volunteer", icon: Users },
  { key: "NGO", label: "NGO / Relief", icon: Building2 },
  { key: "AUTHORITY", label: "Authority", icon: Shield }
];

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedRole = new URLSearchParams(location.search).get("role");
  const [selectedRole, setSelectedRole] = useState(roles.some(role => role.key === requestedRole) ? requestedRole : "VOLUNTEER");
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token || !user) return;
    const routes = { CITIZEN: "/citizen", VOLUNTEER: "/volunteer", NGO: "/ngo", AUTHORITY: "/command" };
    if (routes[user.role]) navigate(routes[user.role], { replace: true });
  }, [navigate]);

  const selectRole = role => { setSelectedRole(role); navigate(`/login?role=${role}`, { replace: true }); };
  const update = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await axios.post(`${API}/auth/login`, form);
      const { token, user } = res.data;
      if (user.role !== selectedRole) throw new Error(`This account is registered as ${user.role.toLowerCase()}, not ${selectedRole.toLowerCase()}.`);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      const routes = { VOLUNTEER: "/volunteer", NGO: "/ngo", AUTHORITY: "/command", CITIZEN: "/citizen" };
      navigate(routes[user.role] || "/login", { replace: true });
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Login failed");
    } finally { setLoading(false); }
  };

  return <div className="login-page"><div className="login-card">
    <div className="login-brand"><div className="brand-mark"><Shield size={24} /></div><div><h1>RESQ</h1><span>RESPONSE NETWORK</span></div></div>
    <div className="login-heading"><span>HOW ARE YOU JOINING?</span><h2>{roles.find(role => role.key === selectedRole)?.label} access</h2><p>Select your operational role first. One account represents one stakeholder in the response network.</p></div>
    <div className="login-roles">{roles.map(role => { const Icon = role.icon; return <button type="button" className={selectedRole === role.key ? "selected" : ""} onClick={() => selectRole(role.key)} key={role.key}><Icon size={15}/><span>{role.label}</span></button>; })}</div>
    <form onSubmit={submit}><label>Email<input type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" required /></label><label>Password<input type="password" name="password" value={form.password} onChange={update} placeholder="Enter your password" required /></label><button className="login-submit" type="submit" disabled={loading}><LogIn size={17} />{loading ? "Signing in..." : `Sign in as ${roles.find(role => role.key === selectedRole)?.label}`}</button></form>
    <div className="login-footer"><Link to="/">← Back to RESQ</Link><span> · </span><Link to={`/signup?role=${selectedRole === "AUTHORITY" ? "VOLUNTEER" : selectedRole}`}>Create responder account</Link></div>
  </div></div>;
}
export default Login;
