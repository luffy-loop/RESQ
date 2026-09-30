import { useState } from "react";
import axios from "axios";
import { Shield, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import "./Signup.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "VOLUNTEER",
    skills: [],
    organizationName: ""
  });

  const [loading, setLoading] = useState(false);

  const update = e => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const submit = async e => {
    e.preventDefault();

    try {
      setLoading(true);

      await axios.post(
        `${API}/auth/register`,
        form
      );

      alert("Account created successfully");
      navigate("/login");
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Unable to create account"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-card">
        <div className="signup-brand">
          <div className="brand-mark">
            <Shield size={24} />
          </div>

          <div>
            <h1>RESQ</h1>
            <span>RESPONSE NETWORK</span>
          </div>
        </div>

        <div className="signup-heading">
          <span>JOIN THE NETWORK</span>

          <h2>Create account</h2>

          <p>
            Create a responder account for volunteer or NGO operations. Citizens do not need an account to report emergencies.
          </p>
        </div>

        <form onSubmit={submit}>
          <label>
            Full Name
            <input
              name="name"
              value={form.name}
              onChange={update}
              placeholder="Your name"
              required
            />
          </label>

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
            Phone
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={update}
              placeholder="Phone number"
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
              placeholder="Create a password"
              required
              minLength="6"
            />
          </label>

          <label>
            Account Type
            <select
              name="role"
              value={form.role}
              onChange={update}
            >
              <option value="VOLUNTEER">Volunteer</option>
              <option value="NGO">NGO</option>
            </select>
          </label>

          {form.role === "NGO" && (
            <label>
              Organization Name
              <input
                name="organizationName"
                value={form.organizationName}
                onChange={update}
                placeholder="NGO / organization name"
                required
              />
            </label>
          )}

          {form.role === "VOLUNTEER" && (
            <label>
              Skills
              <select
                multiple
                value={form.skills}
                onChange={e =>
                  setForm({
                    ...form,
                    skills: Array.from(
                      e.target.selectedOptions,
                      option => option.value
                    )
                  })
                }
              >
                <option value="MEDICAL">Medical</option>
                <option value="FOOD">Food</option>
                <option value="WATER">Water</option>
                <option value="RESCUE">Rescue</option>
                <option value="SHELTER">Shelter</option>
                <option value="CLOTHING">Clothing</option>
              </select>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            <UserPlus size={17} />
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <div className="signup-footer">
          <Link to="/">← Back to citizen access</Link>
          <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default Signup;


