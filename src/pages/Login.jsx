import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Shield, LogIn } from "lucide-react";
import "./Login.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!token || !user) return;

    if (user.role === "CITIZEN") navigate("/citizen", { replace: true });
    else if (user.role === "VOLUNTEER") navigate("/volunteer", { replace: true });
    else if (user.role === "NGO") navigate("/ngo", { replace: true });
    else if (user.role === "AUTHORITY") navigate("/command", { replace: true });
  }, [navigate]);

  const update = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async e => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await axios.post(`${API}/auth/login`, form);
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "VOLUNTEER") navigate("/volunteer", { replace: true });
      else if (user.role === "CITIZEN") navigate("/citizen", { replace: true });
      else if (user.role === "NGO") navigate("/ngo", { replace: true });
      else if (user.role === "AUTHORITY") navigate("/command", { replace: true });
      else navigate("/login", { replace: true });
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark">
            <Shield size={24} />
          </div>
          <div>
            <h1>RESQ</h1>
            <span>RESPONSE NETWORK</span>
          </div>
        </div>

        <div className="login-heading">
          <span>SECURE ACCESS</span>
          <h2>Sign in to RESQ</h2>
          <p>Volunteer, NGO and authority accounts use secure access. Citizens can report emergencies without signing in.</p>
        </div>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={update}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={update}
              placeholder="Enter your password"
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            <LogIn size={17} />
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="login-footer">
          <Link to="/">← Back to citizen emergency access</Link>
          <span> · </span>
          <Link to="/signup">Create responder account</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;


